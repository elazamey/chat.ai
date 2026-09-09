import { describe, it, expect } from 'vitest';
import { createLocalSmokeRunner, LocalRunner, FREE_BUDGET } from './local-runner';
import type { CapabilityExecutor } from '@aok/execution';
import { validateCapabilityName } from '@aok/contracts';
import type { ApprovalPolicy } from '@aok/contracts';

/** منفّذ وهمي يعيد دليلًا — بلا خدمات خارجية ($0). */
function mockExecutor(name: string): CapabilityExecutor {
  return {
    canExecute: async () => true,
    execute: async (input) => ({
      status: 'success',
      output: { name },
      evidence: [{ evidenceId: `${name}-evidence`, kind: 'test_result' }],
    }),
  };
}

const approvalPolicy: ApprovalPolicy = {
  'repo.read': 'auto',
  'test.run': 'auto',
  'github.pull_request.create': 'approval',
};

function buildRunner(overrides: Partial<ConstructorParameters<typeof LocalRunner>[0]> = {}) {
  const runner = new LocalRunner({
    approvalPolicy,
    onApprovalRequired: async () => true, // المستخدم يوافق
    ...overrides,
  });
  runner.grant({ id: 'g-read', principal: 'coder', capability: 'repo.read', scope: '*', effect: 'allow' });
  runner.grant({ id: 'g-test', principal: 'coder', capability: 'test.run', scope: '*', effect: 'allow' });
  runner.grant({ id: 'g-pr', principal: 'coder', capability: 'github.pull_request.create', scope: '*', effect: 'allow' });
  runner.registerExecutor('repo.read', mockExecutor('repo.read'));
  runner.registerExecutor('test.run', mockExecutor('test.run'));
  runner.registerExecutor('github.pull_request.create', mockExecutor('github.pull_request.create'));
  return runner;
}

describe('LocalRunner — vertical slice, local at $0', () => {
  it('provides a bounded side-effect-free smoke runner', async () => {
    const outcome = await createLocalSmokeRunner().run('deployment smoke');

    expect(outcome.verdict).toBe('PASSED');
    expect(outcome.results).toHaveLength(3);
    expect(outcome.results.every((result) => result.status === 'success')).toBe(true);
    expect(outcome.verification.evidence).toHaveLength(3);
  });

  it('records metering events in the tamper-evident ledger', async () => {
    const runner = buildRunner();
    await runner.run('metered task');
    expect(runner.ledger.all.filter((event) => event.type === 'UsageRecorded').length).toBeGreaterThan(0);
    expect(runner.ledger.verifyIntegrity()).toEqual({ valid: true });
  });

  it('runs intent → plan → execute → verify → completed, fully locally', async () => {
    const runner = buildRunner();
    const outcome = await runner.run('fix auth and open a PR');

    expect(outcome.mode).toBe('local');
    expect(outcome.verdict).toBe('PASSED');
    expect(outcome.results.every((r) => r.status === 'success')).toBe(true);
    expect(outcome.verification.evidence.length).toBe(3);

    // الاستخدام: 1 run + 1 model call + 3 tool calls — كله مُقاس
    expect(outcome.usage.total.runs).toBe(1);
    expect(outcome.usage.total.model_calls).toBe(1);
    expect(outcome.usage.total.tool_calls).toBe(3);

    // الـLedger هو مصدر الحقيقة: كل مرحلة تركت أثرًا
    const types = outcome.ledger.map((e) => e.type);
    for (const t of ['RunCreated', 'TaskCreated', 'PlanGenerated', 'ApprovalRequired', 'ApprovalGranted', 'VerificationCompleted', 'TaskCompleted']) {
      expect(types).toContain(t);
    }

    // سلسلة التجزئة سليمة (tamper-evident)
    expect(runner.ledger.verifyIntegrity()).toEqual({ valid: true });
  });

  it('fails the PR step when approval is denied (Human-in-the-Loop)', async () => {
    const runner = buildRunner({ onApprovalRequired: async () => false }); // يرفض
    const outcome = await runner.run('open a PR');
    expect(outcome.verdict).toBe('FAILED');
    const types = outcome.ledger.map((e) => e.type);
    expect(types).toContain('ApprovalDenied');
  });

  it('enforces the budget (Cost Guard) — stops when quota is exhausted', async () => {
    const runner = buildRunner({ budget: { ...FREE_BUDGET, maxToolCalls: 1 } });
    const outcome = await runner.run('fix auth');
    expect(outcome.verdict).toBe('FAILED');
    expect(outcome.usage.total.tool_calls).toBe(1); // توقف عند الحد
    expect(outcome.ledger.map((e) => e.type)).toContain('QuotaExceeded');
  });

  it('denies an un-granted action (no capability, no execution)', async () => {
    const runner = buildRunner();
    runner.registerExecutor('deploy.production', mockExecutor('deploy'));
    // لا grant لـ deploy.production
    const outcome = await runner.run('deploy', { plan: ['deploy.production'] });
    expect(outcome.verdict).toBe('FAILED');
    expect(outcome.ledger.map((e) => e.type)).toContain('ApprovalDenied');
  });

  it('supports cloud mode via CELIA_MODE without changing the kernel', async () => {
    const prev = process.env.CELIA_MODE;
    process.env.CELIA_MODE = 'cloud';
    try {
      const runner = buildRunner();
      const outcome = await runner.run('hello');
      expect(outcome.mode).toBe('cloud');
    } finally {
      if (prev === undefined) delete process.env.CELIA_MODE;
      else process.env.CELIA_MODE = prev;
    }
  });
});

describe('LocalRunner — Namespace + Schema Registry guard (no admin.superpower)', () => {
  it('rejects reserved/unregistered capability names even if granted', async () => {
    const runner = new LocalRunner({
      approvalPolicy,
      onApprovalRequired: async () => true,
      capabilityGuard: { assertCapabilityRegistered: (name) => {
        const r = validateCapabilityName(name);
        if (!r.valid) throw new Error(r.reason);
      } },
    });
    runner.grant({ id: 'g', principal: 'coder', capability: 'admin.superpower', scope: '*', effect: 'allow' });
    runner.registerExecutor('admin.superpower', mockExecutor('x'));

    const outcome = await runner.run('attempt admin', { plan: ['admin.superpower'] });
    expect(outcome.verdict).toBe('FAILED');
    expect(outcome.ledger.map((e) => e.type)).toContain('CapabilityRejected');
  });
});

describe('LocalRunner — Immune Gate (golden rule: every action passes through the gate)', () => {
  it('exposes the Immune Gate and blocks an unknown principal requesting secrets', () => {
    const runner = buildRunner();
    const d = runner.immune.evaluate({
      principal: { id: 'intruder', type: 'agent', trust: 'UNKNOWN', credentials: [] },
      capability: 'secret.read',
    });
    expect(d.allowed).toBe(false);
    expect(d.action).toBe('block');
  });

  it('lets a normal verified agent pass (no false positives on benign runs)', () => {
    const runner = buildRunner();
    const d = runner.immune.evaluate({
      principal: { id: 'coder', type: 'agent', trust: 'VERIFIED', credentials: [] },
      capability: 'repo.read',
    });
    expect(d.allowed).toBe(true);
  });
});
