import { randomUUID } from 'node:crypto';
import {
  DEFAULT_APPROVAL_POLICY,
  systemActor,
  type ApprovalPolicy,
  type BillingAdapter,
  type BudgetPolicy,
  type Capability,
  type CapabilitySpec,
  type Event,
  type Grant,
  type LedgerEvent,
  type Result,
  type Usage,
  type Verification,
  type VerificationCheck,
} from '@aok/contracts';
import { Ledger } from '@aok/events';
import { PolicyEngine } from '@aok/policy';
import {
  ExecutorRegistry,
  createExecutionContext,
  execute,
  type CapabilityExecutor,
  type PolicyContext,
} from '@aok/execution';
import { BudgetQuota, InMemoryUsageMeter } from '@aok/economics';
import { VerificationEngine } from '@aok/verification';
import { MockProvider, ModelRouter } from '@aok/models';
import { InMemoryVault } from '@aok/vault';
import { NoopBillingAdapter } from '@aok/billing';

/** وضع التشغيل (ECONOMIC PRINCIPLE 002/004): local = أولوية، cloud = تبديل adapters فقط. */
export type RunMode = 'local' | 'cloud';

function modeFromEnv(): RunMode {
  return process.env.CELIA_MODE === 'cloud' ? 'cloud' : 'local';
}

/** ميزانية مجانية افتراضية (Free User) — Cost Guard. */
export const FREE_BUDGET: BudgetPolicy = {
  maxExecutionSeconds: 300,
  maxToolCalls: 100,
  maxModelCalls: 20,
  maxNetworkRequests: 20,
  maxRuns: 10,
};

export interface ApprovalRequest {
  action: string;
  reason: string;
}

export interface RunnerOptions {
  mode?: RunMode;
  budget?: BudgetPolicy;
  grants?: Grant[];
  approvalPolicy?: ApprovalPolicy;
  onApprovalRequired?: (req: ApprovalRequest) => Promise<boolean> | boolean;
  billing?: BillingAdapter;
  /** حارس الأسماء (Namespace + Schema Registry) — يرفض قدرات غير مسجّلة/محجوزة. */
  capabilityGuard?: CapabilityGuard;
}

export interface CapabilityGuard {
  assertCapabilityRegistered(name: string): void;
}

export interface ProofCarryingOutcome {
  runId: string;
  taskId: string;
  intent: string;
  actorId: string;
  mode: RunMode;
  verdict: Verification['verdict'];
  results: Result[];
  verification: Verification;
  usage: Usage;
  ledger: LedgerEvent[];
}

export interface RunStep {
  action: string;
  input?: unknown | ((results: Result[]) => unknown);
}

export interface RunTaskOptions {
  actorId?: string;
  plan?: string[]; // إن لم يُقدَّم، يُستمد من الـMockProvider ($0)
  steps?: RunStep[]; // خطوات بإدخالات صريحة (للاستخدام الخارجي مثل GitHub E2E)
  onVerify?: (
    ctx: { results: Result[]; runner: LocalRunner },
  ) => VerificationCheck[] | Promise<VerificationCheck[]>;
}

/**
 * الـLocal Runner — تجميع النواة الذرية في وضع محلي بـ$0 (الـVertical Slice):
 *
 *   Intent → Task → Plan → Policy(+Approval) → execute() → Meter/Quota
 *          → Ledger → Verification(Evidence) → Completed
 *
 * كله local: MockProvider (0$)، Vault في الذاكرة، Billing noop.
 * (CELIA_MODE=cloud يبدّل adapters لاحقًا دون تغيير النواة.)
 */
export class LocalRunner {
  readonly ledger = new Ledger();
  readonly meter = new InMemoryUsageMeter();
  readonly executors = new ExecutorRegistry();
  readonly verifier = new VerificationEngine();
  readonly mockProvider = new MockProvider();
  readonly router = new ModelRouter([this.mockProvider]);
  readonly vault = new InMemoryVault();

  private policy: PolicyEngine;
  private quota: BudgetQuota;
  private mode: RunMode;
  private onApprovalRequired?: (req: ApprovalRequest) => Promise<boolean> | boolean;
  private billing: BillingAdapter;
  private capabilityGuard?: CapabilityGuard;

  constructor(opts: RunnerOptions = {}) {
    this.mode = opts.mode ?? modeFromEnv();
    this.quota = new BudgetQuota(opts.budget ?? FREE_BUDGET);
    this.policy = new PolicyEngine(opts.grants ?? [], opts.approvalPolicy ?? DEFAULT_APPROVAL_POLICY);
    this.onApprovalRequired = opts.onApprovalRequired;
    this.billing = opts.billing ?? new NoopBillingAdapter();
    this.capabilityGuard = opts.capabilityGuard;
  }

  registerExecutor(action: string, executor: CapabilityExecutor): void {
    this.executors.register(action, executor);
  }

  grant(grant: Grant): void {
    this.policy.addGrant(grant);
  }

  async run(intent: string, opts: RunTaskOptions = {}): Promise<ProofCarryingOutcome> {
    const actorId = opts.actorId ?? 'coder';
    const taskId = randomUUID();
    const runId = randomUUID();

    // 1) Intent → Task
    this.ledger.append({ actor: systemActor, type: 'RunCreated', taskId, runId, payload: { intent, mode: this.mode } });
    this.ledger.append({ actor: systemActor, type: 'TaskCreated', taskId, runId, payload: { intent } });
    this.meter.record({ resource: 'runs', amount: 1, at: Date.now(), actorId, runId });

    // 2) Plan (0$ — MockProvider حتمي)
    const plan = opts.plan ?? (await this.planWithMock(intent));
    const steps: RunStep[] =
      opts.steps ?? plan.map((action) => ({ action, input: {} }));
    this.meter.record({ resource: 'model_calls', amount: 1, at: Date.now(), actorId, runId });
    this.ledger.append({ actor: systemActor, type: 'PlanGenerated', taskId, runId, payload: { plan: steps.map((s) => s.action) } });

    const results: Result[] = [];
    const emit = this.makeEmitter(taskId, runId, actorId);
    const policyCtx: PolicyContext = { evaluate: (action) => this.policy.evaluate(actorId, action) };

    // 3) تنفيذ كل خطوة عبر execute() مع سياج السياسة + الموافقة + الـquota + حارس الأسماء
    for (const step of steps) {
      const action = step.action;

      // حارس الأسماء (Namespace + Schema Registry): لا قدرات محجوزة/غير مسجّلة
      try {
        this.capabilityGuard?.assertCapabilityRegistered(action);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.ledger.append({ actor: systemActor, type: 'CapabilityRejected', taskId, runId, payload: { action, reason } });
        results.push({ status: 'failure', output: { error: reason }, evidence: [] });
        continue;
      }

      const decision = this.policy.evaluate(actorId, action as Capability);

      if (!decision.allowed) {
        this.ledger.append({ actor: systemActor, type: 'ApprovalDenied', taskId, runId, payload: { action, reason: decision.reason } });
        results.push({ status: 'failure', output: { error: decision.reason }, evidence: [] });
        continue;
      }

      if (decision.approvalRequired) {
        this.ledger.append({ actor: systemActor, type: 'ApprovalRequired', taskId, runId, payload: { action } });
        const approved = await this.onApprovalRequired?.({ action, reason: decision.reason });
        if (!approved) {
          this.ledger.append({ actor: systemActor, type: 'ApprovalDenied', taskId, runId, payload: { action, reason: 'not approved' } });
          results.push({ status: 'failure', output: { error: `'${action}' requires approval` }, evidence: [] });
          continue;
        }
        this.ledger.append({ actor: systemActor, type: 'ApprovalGranted', taskId, runId, payload: { action } });
      }

      // Cost Guard: حد صريح قبل التنفيذ
      const q = this.quota.allows(this.meter.usage(), { resource: 'tool_calls', amount: 1 });
      if (!q.allowed) {
        this.ledger.append({ actor: systemActor, type: 'QuotaExceeded', taskId, runId, payload: { action, reason: q.reason } });
        results.push({ status: 'failure', output: { error: q.reason }, evidence: [] });
        break;
      }

      const ctx = createExecutionContext({
        runId,
        actorId,
        capabilities: this.capabilitiesFor(action as Capability),
        policy: policyCtx,
        emit,
      });

      const result = await execute(action, this.resolveInput(step, results), ctx, this.executors);
      this.meter.record({ resource: 'tool_calls', amount: 1, at: Date.now(), actorId, runId });
      results.push(result);
    }

    // 4) Verification (RULE 005): لا نجاح بدون دليل
    const checks: VerificationCheck[] = opts.onVerify
      ? await opts.onVerify({ results, runner: this })
      : results.map((r, i) => ({
          id: `check-${i}`,
          name: `action[${i}]`,
          verdict: r.status === 'success' ? ('PASSED' as const) : ('FAILED' as const),
          evidence: r.evidence,
        }));
    const verification = this.verifier.verify(intent, checks);
    this.ledger.append({
      actor: systemActor,
      type: 'VerificationCompleted',
      taskId,
      runId,
      payload: { verdict: verification.verdict, evidence: verification.evidence },
    });

    // 5) Outcome
    if (verification.verdict === 'PASSED') {
      this.ledger.append({ actor: systemActor, type: 'TaskCompleted', taskId, runId, payload: { intent } });
    } else {
      this.ledger.append({ actor: systemActor, type: 'TaskFailed', taskId, runId, payload: { intent, verdict: verification.verdict } });
    }

    // 6) الفوترة (adapter خارجي — noop في الوضع المحلي)
    const usage = this.meter.usage();
    await this.billing.report(usage);

    return {
      runId,
      taskId,
      intent,
      actorId,
      mode: this.mode,
      verdict: verification.verdict,
      results,
      verification,
      usage,
      ledger: this.ledger.all,
    };
  }

  private async planWithMock(_intent: string): Promise<string[]> {
    const res = (await this.mockProvider.invoke({ taskType: 'planning' })) as { content: string };
    try {
      const parsed = JSON.parse(res.content) as { plan: string[] };
      return parsed.plan ?? ['repo.read'];
    } catch {
      return ['repo.read'];
    }
  }

  private capabilitiesFor(action: Capability): CapabilitySpec[] {
    return [{ id: `${action}@*`, action, scope: '*', constraints: [] }];
  }

  private resolveInput(step: RunStep, results: Result[]): unknown {
    if (typeof step.input === 'function') return step.input(results);
    return step.input ?? {};
  }

  private makeEmitter(taskId: string, runId: string, actorId: string) {
    return async (e: Omit<Event, 'id' | 'timestamp'>): Promise<Event> => {
      const stored = this.ledger.append({
        actor: { type: 'agent', id: actorId },
        type: e.type,
        taskId,
        runId,
        payload: e.payload,
      });
      return { id: stored.id, type: stored.type, entityId: taskId, actorId, timestamp: Date.now(), payload: stored.payload };
    };
  }
}
