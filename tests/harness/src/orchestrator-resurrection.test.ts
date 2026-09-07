import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type ApprovalPolicy, type BudgetPolicy, type Result } from '@aok/contracts';
import { execute, ExecutorRegistry, createExecutionContext } from '@aok/execution';
import { PolicyEngine } from '@aok/policy';
import { BudgetQuota, InMemoryUsageMeter } from '@aok/economics';
import { ImmuneRuntime } from '@aok/immune';
import { SqliteEventStore, DurableLedger } from '@aok/store';
import {
  DagExecutor,
  CrashInjectedError,
  InProcessScheduler,
  type NodeHandler,
  type NodeResult,
  type WorkflowNode,
} from '@aok/orchestrator';

/**
 * M4.12 — Resurrection + Chaos E2E (بالـ$0، مع SQLite حقيقي):
 *
 *   Parallel DAG + Retry + Approval + Quota + Runner crash +
 *   Network interruption + Duplicate delivery
 *
 * والنتيجة المطلوبة:
 *   NO duplicate side effect · NO unauthorized execution · NO lost state
 *   NO corrupted ledger · NO bypass of quota · NO bypass of approval
 *
 * الـOrchestrator يستدعي عقود النواة (execute + Policy + Quota + Immune)
 * ولا يملك أيًا منها — الـhandler أدناه هو الـglue الوحيد.
 */

const tempDirs: string[] = [];
afterEach(() => {
  for (const d of tempDirs.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'aok-m4-'));
  tempDirs.push(dir);
  return join(dir, 'events.db');
}

const APPROVAL: ApprovalPolicy = {
  'network.http': 'auto',
  'build.a': 'auto',
  'build.b': 'auto',
  'build.c': 'auto',
  'deployment.create': 'approval',
  'verification.check': 'auto',
  'deployment.delete': 'auto',
};

const BUDGET: BudgetPolicy = {
  maxExecutionSeconds: 300,
  maxToolCalls: 100,
  maxModelCalls: 20,
  maxNetworkRequests: 20,
  maxRuns: 10,
};

interface SideEffects {
  fetches: number;
  builds: string[];
  deployments: number;
  deletes: number;
  verifications: number;
}

/** عالم العمل — يربط الـOrchestrator بنواة التنفيذ (Policy+Quota+Registry+Immune). */
class World {
  readonly sideEffects: SideEffects = { fetches: 0, builds: [], deployments: 0, deletes: 0, verifications: 0 };
  readonly calls: string[] = [];
  readonly approvals: string[] = [];
  policy: PolicyEngine;
  quota: BudgetQuota;
  meter = new InMemoryUsageMeter();
  registry = new ExecutorRegistry();
  networkFailures = 0;
  approve = true;
  actorId = 'coder';

  constructor(budget: BudgetPolicy = BUDGET, grants: string[] = ['network.http', 'build.a', 'build.b', 'build.c', 'deployment.create', 'verification.check', 'deployment.delete']) {
    this.policy = new PolicyEngine(grants.map((c, i) => ({ id: `g${i}`, principal: this.actorId, capability: c, scope: '*', effect: 'allow' as const })), APPROVAL);
    this.quota = new BudgetQuota(budget);
    this.registerExecutors();
  }

  private registerExecutors(): void {
    const ok = (output: unknown, evidenceId: string): Result => ({ status: 'success', output, evidence: [{ evidenceId, kind: 'test_result' }] });
    const can = async () => true;

    this.registry.register('network.http', {
      canExecute: can,
      execute: async () => {
        this.calls.push('network.http');
        if (this.networkFailures > 0) {
          this.networkFailures -= 1;
          return { status: 'failure', output: { error: 'ECONNRESET: connection reset by peer' }, evidence: [] };
        }
        this.sideEffects.fetches += 1;
        return ok({ fetched: true }, 'fetch');
      },
    });
    for (const b of ['build.a', 'build.b', 'build.c']) {
      this.registry.register(b, {
        canExecute: can,
        execute: async () => {
          this.calls.push(b);
          this.sideEffects.builds.push(b);
          return ok({ built: b }, b);
        },
      });
    }
    this.registry.register('deployment.create', {
      canExecute: can,
      execute: async () => {
        this.calls.push('deployment.create');
        this.sideEffects.deployments += 1;
        return ok({ deployed: true }, 'deploy');
      },
    });
    this.registry.register('deployment.delete', {
      canExecute: can,
      execute: async () => {
        this.calls.push('deployment.delete');
        this.sideEffects.deletes += 1;
        return ok({ deleted: true }, 'delete');
      },
    });
    this.registry.register('verification.check', {
      canExecute: can,
      execute: async () => {
        this.calls.push('verification.check');
        this.sideEffects.verifications += 1;
        return ok({ verified: true }, 'verify');
      },
    });
  }

  handler(runId: string): NodeHandler {
    const world = this;
    const approved = new Set<string>();
    return {
      async run(action, input, node): Promise<NodeResult> {
        const decision = world.policy.evaluate(world.actorId, action);
        if (!decision.allowed) return { status: 'failure', output: { error: decision.reason }, evidence: [] };
        if (decision.approvalRequired && !approved.has(action)) {
          return { status: 'failure', output: { error: `'${action}' requires approval` }, evidence: [] };
        }
        const q = world.quota.allows(world.meter.usage(), { resource: 'tool_calls', amount: 1 });
        if (!q.allowed) return { status: 'failure', output: { error: q.reason }, evidence: [] };
        world.meter.record({ resource: 'tool_calls', amount: 1, at: Date.now(), actorId: world.actorId, runId });
        const ctx = createExecutionContext({
          runId,
          actorId: world.actorId,
          capabilities: [{ id: `c-${action}`, action, scope: '*', constraints: [] }],
          policy: { evaluate: () => ({ allowed: true, approvalRequired: false, reason: 'pre-checked by control plane' }) },
        });
        try {
          return await execute(action, input, ctx, world.registry);
        } catch (err) {
          return { status: 'failure', output: { error: err instanceof Error ? err.message : String(err) }, evidence: [] };
        }
      },
      requiresApproval: (action) => world.policy.evaluate(world.actorId, action).approvalRequired && !approved.has(action),
      async requestApproval(req) {
        const grant = world.approve;
        if (grant) {
          approved.add(req.action);
          world.approvals.push(req.action);
        }
        return grant;
      },
    };
  }
}

const executorOpts = {
  sleep: async () => {},
  limits: { maxConcurrentJobs: 3, maxConcurrentPerAgent: 3, maxConcurrentPerTenant: 3, maxConcurrentPerTool: 3 },
};

function graph(): WorkflowNode[] {
  return [
    { id: 'fetch', kind: 'ACTION', action: 'network.http', deps: [], retry: { maxAttempts: 3, backoff: 'fixed', retryableErrors: ['ECONNRESET'], jitter: false } },
    { id: 'build-a', kind: 'ACTION', action: 'build.a', deps: ['fetch'] },
    { id: 'build-b', kind: 'ACTION', action: 'build.b', deps: ['fetch'] },
    { id: 'build-c', kind: 'ACTION', action: 'build.c', deps: ['fetch'] },
    { id: 'gate', kind: 'APPROVAL', deps: ['build-a', 'build-b', 'build-c'], approval: { action: 'deployment.create', reason: 'manual deploy gate' } },
    { id: 'deploy', kind: 'ACTION', action: 'deployment.create', deps: ['gate'] },
    { id: 'verify', kind: 'ACTION', action: 'verification.check', deps: ['deploy'] },
  ];
}

describe('M4.12 — Resurrection + Chaos E2E (real SQLite)', () => {
  it('parallel + retry + approval + network interruption + runner crash → hydrate → resume: NO duplicate, NO lost state, NO corruption', async () => {
    const dbPath = tempDb();
    const world = new World();
    world.networkFailures = 1; // network interruption → retry

    const store1 = new SqliteEventStore(dbPath);
    const ledger1 = new DurableLedger(store1);
    await ledger1.hydrate();

    const exec1 = new DagExecutor(world.handler('run-1'), {
      ledger: ledger1,
      onPersist: () => ledger1.flush(),
      onBeforeStart: (nodeId) => {
        if (nodeId === 'deploy') throw new CrashInjectedError(); // قتل الـrunner قبل نشر فعلي
      },
      ...executorOpts,
    });

    // القتل في منتصف التنفيذ
    await expect(exec1.run(graph(), { taskId: 't1', runId: 'run-1' })).rejects.toThrow(CrashInjectedError);
    await ledger1.flush();

    // قبل القتل: fetch (مع retry) + builds + gate (approval) اكتملت وثُبّتت
    expect(world.sideEffects.deployments).toBe(0); // القتل قبل الأثر الجانبي
    expect(world.approvals).toEqual(['deployment.create']); // موافقة واحدة
    expect(world.sideEffects.fetches).toBe(1); // network retry نجح
    expect(world.calls.filter((c) => c === 'network.http').length).toBe(2);

    // إعادة التشغيل: hydrate من القرص ثم resume
    const store2 = new SqliteEventStore(dbPath);
    const ledger2 = new DurableLedger(store2);
    await ledger2.hydrate();
    const world2 = new World(); // عالم جديد (حالة جانبية صفرية) — لكن النتائج المكتملة لا تُعاد
    const exec2 = new DagExecutor(world2.handler('run-1'), { ledger: ledger2, onPersist: () => ledger2.flush(), ...executorOpts });
    await exec2.hydrate(ledger2.all);
    const out = await exec2.resume();

    expect(out.status).toBe('COMPLETED');
    expect(out.completed.sort()).toEqual(['build-a', 'build-b', 'build-c', 'deploy', 'fetch', 'gate', 'verify']);
    // NO lost state: العقد المكتملة قبل القتل لم تُنفَّذ مجددًا
    expect(world2.sideEffects.fetches).toBe(0);
    expect(world2.sideEffects.builds.length).toBe(0);
    // NO duplicate side effect: النشر حدث مرة واحدة فقط (في الـresume)
    expect(world2.sideEffects.deployments).toBe(1);
    // NO corrupted ledger
    expect(ledger2.verifyIntegrity().valid).toBe(true);
  });

  it('duplicate delivery → NO duplicate side effect (idempotency)', async () => {
    const world = new World();
    class RedeliveringScheduler extends InProcessScheduler {
      override async enqueue(job: import('@aok/orchestrator').WorkflowJob): Promise<void> {
        await super.enqueue(job);
        await super.enqueue({ ...job }); // at-least-once delivery
      }
    }
    const executor = new DagExecutor(world.handler('run-dup'), { scheduler: new RedeliveringScheduler(), ...executorOpts });
    const out = await executor.run(graph(), { taskId: 't', runId: 'run-dup' });

    expect(out.status).toBe('COMPLETED');
    expect(world.sideEffects.deployments).toBe(1); // NO duplicate side effect
    expect(world.sideEffects.verifications).toBe(1);
    expect(out.dedupedDeliveries).toBeGreaterThan(0);
  });

  it('NO bypass of quota: tiny budget stops side effects at the Cost Guard', async () => {
    const world = new World({ ...BUDGET, maxToolCalls: 3 });
    const executor = new DagExecutor(world.handler('run-quota'), { ...executorOpts, limits: { ...executorOpts.limits, maxConcurrentJobs: 1 } });
    const out = await executor.run(graph(), { taskId: 't', runId: 'run-quota' });

    expect(out.status).toBe('FAILED');
    expect(out.failed.some((f) => f.error.includes('quota exceeded'))).toBe(true);
    expect(world.sideEffects.deployments).toBe(0); // النشر لم يحدث (لا تجاوز للـquota)
    expect(world.meter.usage().total.tool_calls).toBeLessThanOrEqual(3);
  });

  it('NO bypass of approval: denial blocks deployment entirely', async () => {
    const world = new World();
    world.approve = false;
    const executor = new DagExecutor(world.handler('run-deny'), executorOpts);
    const out = await executor.run(graph(), { taskId: 't', runId: 'run-deny' });

    expect(out.status).toBe('FAILED');
    expect(world.sideEffects.deployments).toBe(0); // الموافقة مرفوضة → لا نشر
  });

  it('NO unauthorized execution: no grant → no side effect', async () => {
    // الـagent بلا أي منح، وقدرة 'auto' (لا موافقة) — يُرفض عند الـPolicy Engine.
    const world = new World(BUDGET, []);
    const g: WorkflowNode[] = [{ id: 'probe', kind: 'ACTION', action: 'verification.check', deps: [] }];
    const executor = new DagExecutor(world.handler('run-unauth'), executorOpts);
    const out = await executor.run(g, { taskId: 't', runId: 'run-unauth' });

    expect(out.status).toBe('FAILED');
    expect(out.failed.map((f) => f.nodeId)).toContain('probe');
    expect(out.failed.find((f) => f.nodeId === 'probe')?.error).toContain('no allow grant');
    expect(world.sideEffects.verifications).toBe(0);
  });

  it('repeated failure → immune risk → circuit breaker → stop (real ImmuneRuntime)', async () => {
    const world = new World();
    // عقدة شبكة تفشل دائمًا (ECONNRESET) مع maxAttempts كبيرة — الجهاز المناعي يوقفها.
    world.networkFailures = 999;
    const g: WorkflowNode[] = [
      { id: 'fetch', kind: 'ACTION', action: 'network.http', deps: [], retry: { maxAttempts: 10, backoff: 'fixed', retryableErrors: ['ECONNRESET'], jitter: false } },
    ];

    const immune = new ImmuneRuntime();
    const failureGuard = {
      assess(nodeId: string, failures: number, _error: string) {
        const decision = immune.gate.evaluate({
          principal: { id: nodeId, type: 'agent', trust: 'VERIFIED', credentials: [] },
          capability: 'workflow.node',
          observation: { repeatedFailures: failures },
        });
        if (!decision.allowed) {
          return { stop: true, quarantine: decision.action === 'quarantine' || decision.action === 'kill', reason: decision.reasons.join('; ') };
        }
        return { stop: false, quarantine: false };
      },
    };

    const executor = new DagExecutor(world.handler('run-immune'), { ...executorOpts, failureGuard });
    const out = await executor.run(g, { taskId: 't', runId: 'run-immune' });

    expect(out.status).toBe('FAILED');
    // توقف بعد 3 إخفاقات (المناعة فتحت الدائرة)، وليس 10 محاولات.
    expect(world.calls.filter((c) => c === 'network.http').length).toBe(3);
  });
});
