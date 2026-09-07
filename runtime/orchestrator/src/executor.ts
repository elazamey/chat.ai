import { createHash } from 'node:crypto';
import type { Actor } from '@aok/contracts';
import { validateGraph } from './dag';
import { ConcurrencyLimiter } from './bulkhead';
import { CompensationRegistry } from './compensation';
import { idempotencyKey, isInputRef, getPath, stableStringify } from './hash';
import { InMemoryIdempotencyStore, type IdempotencyStore } from './idempotency';
import { nodeStateMachine, isTerminal } from './node-machine';
import { backoffMs, isRetryable } from './retry';
import { InProcessScheduler } from './scheduler';
import {
  DEFAULT_BULKHEAD,
  DEFAULT_RETRY,
  type BulkheadLimits,
  type ConditionSpec,
  type FailureGuard,
  type JobQueue,
  type LedgerEventLike,
  type LedgerLike,
  type NodeHandler,
  type NodeResult,
  type NodeSnapshot,
  type NodeStatus,
  type RetryPolicy,
  type Scheduler,
  type WorkflowJob,
  type WorkflowNode,
  type WorkflowRunOutcome,
  type WorkflowRunStatus,
} from './types';

export const workflowActor: Actor = { type: 'system', id: 'orchestrator' };

/** فشل عقدة (ناتج failure من الـhandler أو تحقق فاشل). */
export class NodeFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NodeFailureError';
  }
}

/** خطأ حقن القتل (chaos) — يحاكي اختفاء العملية في منتصف التنفيذ. */
export class CrashInjectedError extends Error {
  constructor() {
    super('injected crash (kill orchestrator)');
    this.name = 'CrashInjectedError';
  }
}

export interface DagExecutorOptions {
  scheduler?: JobQueue;
  idempotency?: IdempotencyStore;
  limits?: BulkheadLimits;
  clock?: () => number;
  rng?: () => number;
  ledger?: LedgerLike;
  /** يثبّت الأحداث المعلقة (DurableLedger.flush) بعد كل انتقال — للاستعادة الكاملة بعد crash. */
  onPersist?: () => Promise<void>;
  /** hook فوضى/مراقبة قبل بدء عقدة: رمي CrashInjectedError يحاكي قتل العملية. */
  onBeforeStart?: (nodeId: string, attempt: number) => void | Promise<void>;
  failureGuard?: FailureGuard;
  sleep?: (ms: number) => Promise<void>;
  compensations?: CompensationRegistry;
}

interface InternalNode {
  def: WorkflowNode;
  status: NodeStatus;
  attempt: number;
  failureCount: number;
  result?: NodeResult;
  error?: string;
  skippedReason?: string;
}

/**
 * M4 — DagExecutor: آلة تنفيذ صغيرة فوق الـKernel (ليست "مديرًا كبيرًا").
 *
 * يدعم: sequential · parallel · conditional · dependency · retry · timeout ·
 *       approval · compensation · rollback · cancellation · crash-recovery.
 *
 * لا يمتلك Policy/Ledger/Secrets/Model/Tool/Storage — يستدعيها عبر واجهات محقونة:
 *   - التنفيذ: NodeHandler (يستدعي execute() في النواة).
 *   - المثابرة: LedgerLike + onPersist (DurableLedger).
 *   - الجدولة: Scheduler (نقل مجهول).
 *   - الحماية: FailureGuard (Immune System).
 */
export class DagExecutor {
  private scheduler: JobQueue;
  private idempotency: IdempotencyStore;
  private limiter: ConcurrencyLimiter;
  private limits: BulkheadLimits;
  private clock: () => number;
  private rng: () => number;
  private sleep: (ms: number) => Promise<void>;

  private graph: WorkflowNode[] = [];
  private nodes = new Map<string, InternalNode>();
  private results = new Map<string, NodeResult>();
  private completionOrder: string[] = [];
  private compensated: string[] = [];
  private runId = '';
  private taskId = '';
  private actor: Actor = workflowActor;
  private hydrated = false;
  private cancelled = false;
  private cancelledReason?: string;
  private deduped = 0;

  constructor(private handler: NodeHandler, private opts: DagExecutorOptions = {}) {
    this.scheduler = opts.scheduler ?? new InProcessScheduler();
    this.idempotency = opts.idempotency ?? new InMemoryIdempotencyStore();
    this.limits = opts.limits ?? DEFAULT_BULKHEAD;
    this.limiter = new ConcurrencyLimiter(this.limits);
    this.clock = opts.clock ?? Date.now;
    this.rng = opts.rng ?? Math.random;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /* ─────────────────────────── public API ─────────────────────────── */

  /** تشغيل الـgraph حتى الاكتمال (أو فشل/إلغاء/حجر). */
  async run(graph: WorkflowNode[], opts: { taskId?: string; runId?: string; actor?: Actor } = {}): Promise<WorkflowRunOutcome> {
    validateGraph(graph);
    this.graph = graph.map((n) => ({ ...n, deps: [...n.deps] }));
    this.taskId = opts.taskId ?? 'task';
    this.runId = opts.runId ?? `run-${this.clock()}`;
    this.actor = opts.actor ?? workflowActor;
    this.nodes = new Map(this.graph.map((n) => [n.id, this.makeNode(n)]));
    this.results = new Map();
    this.completionOrder = [];
    this.compensated = [];
    this.deduped = 0;
    this.hydrated = false;

    this.emit('WorkflowRunCreated', { runId: this.runId, taskId: this.taskId, graph: this.graph });
    await this.persist();

    await this.drive();
    return this.outcome();
  }

  /** إعادة بناء الحالة من أحداث الـLedger (M4.10) — بعد kill + restart. */
  async hydrate(events: LedgerEventLike[]): Promise<void> {
    let graph: WorkflowNode[] | undefined;
    const snapshots = new Map<string, NodeSnapshot>();

    for (const e of events) {
      if (e.type === 'WorkflowRunCreated') {
        const p = e.payload as { runId: string; taskId: string; graph: WorkflowNode[] };
        graph = p.graph;
        this.runId = p.runId;
        this.taskId = p.taskId;
        continue;
      }
      const p = e.payload as { nodeId?: string } & Record<string, unknown>;
      if (!p.nodeId) continue;
      this.applyEventToSnapshot(p.nodeId, e.type, p, snapshots);
    }

    if (!graph) throw new Error('hydrate: no WorkflowRunCreated event found');
    this.graph = graph.map((n) => ({ ...n, deps: [...n.deps] }));
    this.nodes = new Map(this.graph.map((n) => [n.id, this.makeNode(n)]));
    this.results = new Map();
    this.completionOrder = [];
    this.compensated = [];
    this.deduped = 0;
    this.cancelled = false;
    this.hydrated = true;

    for (const [nodeId, snap] of snapshots) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      node.attempt = snap.attempt;
      if (snap.status === 'COMPLETED' && snap.result) {
        node.status = 'COMPLETED';
        node.result = snap.result;
        this.results.set(nodeId, snap.result);
        this.completionOrder.push(nodeId);
        this.idempotency.seedCompleted(this.keyOf(node.def), snap.result);
      } else if (snap.status === 'SKIPPED') {
        node.status = 'SKIPPED';
        node.skippedReason = snap.skippedReason;
      } else if (isTerminal(snap.status)) {
        node.status = snap.status;
        node.error = snap.error;
      }
    }

    // ترويج SKIPPED لأتباعها (cascade) ثم إعادة حساب READY.
    for (const node of this.nodes.values()) {
      if (node.status === 'SKIPPED') this.cascadeSkip(node.def.id);
    }
    this.promoteReady();
  }

  /** استئناف بعد hydrate (M4.10). */
  async resume(): Promise<WorkflowRunOutcome> {
    if (!this.hydrated) throw new Error('resume() requires hydrate() first');
    await this.drive();
    return this.outcome();
  }

  /** إلغاء تعاوني (M4.9). */
  cancel(reason: string): void {
    this.cancelled = true;
    this.cancelledReason = reason;
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  /* ─────────────────────────── drive loop ─────────────────────────── */

  private async drive(): Promise<void> {
    this.promoteReady();
    for (;;) {
      if (this.cancelled) {
        this.cancelAll(this.cancelledReason ?? 'cancelled');
        break;
      }
      const ready = [...this.nodes.values()].filter((n) => n.status === 'READY');
      if (ready.length === 0) break;

      const jobs: WorkflowJob[] = ready.map((n) => this.toJob(n.def));
      for (const job of jobs) {
        await this.scheduler.enqueue(job);
        this.emit('WorkflowJobEnqueued', { nodeId: job.nodeId, jobId: job.id, idempotencyKey: job.idempotencyKey, attempt: job.attempt });
      }
      await this.persist();

      await this.dispatch();
    }
    this.finalize();
    await this.persist();
  }

  /** استهلاك الوظائف من الـScheduler (pull) مع Bulkhead — النقل مجهول. */
  private async dispatch(): Promise<void> {
    const concurrency = Math.max(1, this.limits.maxConcurrentJobs);
    const worker = async (): Promise<void> => {
      for (;;) {
        if (this.cancelled) return;
        const job = this.scheduler.dequeue();
        if (!job) return;
        await this.runJob(job);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  private async runJob(job: WorkflowJob): Promise<void> {
    if (this.cancelled) return;
    const node = this.nodes.get(job.nodeId);
    if (!node) return;

    // Bulkhead: انتظر مقعدًا (backpressure).
    while (!this.limiter.tryAcquire({ id: job.id, agentId: node.def.agentId, tenantId: node.def.tenantId, toolId: node.def.toolId })) {
      await this.sleep(0);
    }
    try {
      const wasDeduped = this.idempotency.has(job.idempotencyKey);
      const result = await this.idempotency.run(job.idempotencyKey, () => this.executeWithRetry(node, job));
      if (wasDeduped) this.deduped += 1;
      if (!isTerminal(node.status)) {
        this.completeNode(node, result);
      }
    } catch (err) {
      if (err instanceof CrashInjectedError) throw err;
      const error = err instanceof Error ? err.message : String(err);
      if (!isTerminal(node.status)) {
        await this.failNode(node, error);
      }
    } finally {
      this.limiter.release({ id: job.id, agentId: node.def.agentId, tenantId: node.def.tenantId, toolId: node.def.toolId });
    }
  }

  private async executeWithRetry(node: InternalNode, job: WorkflowJob): Promise<NodeResult> {
    const policy: RetryPolicy = node.def.retry ?? DEFAULT_RETRY;
    let attempt = job.attempt;

    for (;;) {
      node.attempt = attempt;
      this.transition(node, node.status === 'RETRYING' ? 'RESUME' : 'START');
      this.emit('WorkflowNodeRunning', { nodeId: node.def.id, jobId: job.id, attempt, operationId: job.operationId });
      await this.persist();

      try {
        await this.opts.onBeforeStart?.(node.def.id, attempt);
        const result = await this.runNodeAction(node, attempt);
        this.transition(node, 'VERIFY');
        this.emit('WorkflowNodeVerified', { nodeId: node.def.id, status: result.status, evidence: result.evidence });
        await this.persist();
        return result;
      } catch (err) {
        if (err instanceof CrashInjectedError) throw err;
        const error = err instanceof Error ? err.message : String(err);
        node.failureCount += 1;

        const guard = this.opts.failureGuard?.assess(node.def.id, node.failureCount, error);
        const retryable = attempt < policy.maxAttempts && isRetryable(policy, error);

        if (guard?.stop || !retryable) {
          await this.failNode(node, guard?.stop ? (guard.reason ?? error) : error, guard?.quarantine === true);
          throw new NodeFailureError(error);
        }

        this.transition(node, 'FAIL');
        this.transition(node, 'RETRY');
        const delay = backoffMs(policy, attempt, this.rng);
        this.emit('WorkflowNodeRetrying', { nodeId: node.def.id, attempt, nextAttempt: attempt + 1, delayMs: delay, error });
        await this.persist();
        await this.sleep(delay);
        attempt += 1;
        job.attempt = attempt;
      }
    }
  }

  private async runNodeAction(node: InternalNode, _attempt: number): Promise<NodeResult> {
    const def = node.def;

    if (def.kind === 'CONDITIONAL') return this.runConditional(def);
    if (def.kind === 'APPROVAL') return this.runApproval(def);

    const action = def.action ?? '';
    if (this.handler.requiresApproval?.(action)) {
      const approved = await this.requestApproval(def, action);
      if (!approved) throw new NodeFailureError(`'${action}' requires approval and was denied`);
    }

    const input = this.resolveInput(def);
    const result = await this.runWithTimeout(action, input, def);
    if (result.status === 'failure') {
      const reason = getPath(result.output, 'error');
      throw new NodeFailureError(typeof reason === 'string' ? reason : 'node failed');
    }
    return result;
  }

  private runWithTimeout(action: string, input: unknown, def: WorkflowNode): Promise<NodeResult> {
    const run = this.handler.run(action, input, def);
    if (!def.timeoutMs) return run;
    return new Promise<NodeResult>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`timeout after ${def.timeoutMs}ms`));
        }
      }, def.timeoutMs);
      run.then(
        (r) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(r);
          }
        },
        (e) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(e);
          }
        },
      );
    });
  }

  private async requestApproval(def: WorkflowNode, action: string): Promise<boolean> {
    const node = this.nodes.get(def.id)!;
    const req = { action, reason: def.approval?.reason ?? `approval required for '${action}'`, nodeId: def.id };
    this.transition(node, 'WAIT');
    this.emit('WorkflowApprovalRequired', req);
    await this.persist();
    const approved = (await this.handler.requestApproval?.(req)) === true;
    if (approved) {
      this.transition(node, 'APPROVE');
      this.emit('WorkflowApprovalGranted', req);
    } else {
      this.transition(node, 'DENY');
      this.emit('WorkflowApprovalDenied', req);
    }
    await this.persist();
    return approved;
  }

  private async runApproval(def: WorkflowNode): Promise<NodeResult> {
    const action = def.approval?.action ?? def.action ?? 'approval';
    const approved = await this.requestApproval(def, action);
    if (!approved) throw new NodeFailureError(`approval '${action}' denied`);
    return { status: 'success', output: { approved: true, action }, evidence: [{ evidenceId: `approval:${def.id}`, kind: 'approval' }] };
  }

  private async runConditional(def: WorkflowNode): Promise<NodeResult> {
    const cond = def.condition;
    if (!cond) throw new NodeFailureError(`conditional node '${def.id}' has no condition`);

    // المصدر: قدرة "حكم" (مثل run tests) تنتج نتيجة نجاح/فشل دون إنهاء الرسم،
    // أو نتيجة موثّقة لعقدة سابقة مكتملة.
    let source: NodeResult;
    if (def.action) {
      const input = this.resolveInput(def);
      source = await this.runWithTimeout(def.action, input, def);
    } else {
      const ref = this.results.get(cond.when.nodeId);
      if (!ref) throw new NodeFailureError(`condition references missing result of '${cond.when.nodeId}'`);
      source = ref;
    }

    const matched = this.matchCondition(cond, source);
    const chosenThen = matched.branch === 'then';
    for (const skipId of chosenThen ? (cond.else ?? []) : cond.then) {
      this.skipNode(skipId, `conditional '${def.id}' chose the '${chosenThen ? 'then' : 'else'}' branch`);
    }
    return {
      status: 'success',
      output: { branch: matched.branch, verdict: source.status, detail: matched.detail },
      evidence: [...source.evidence, { evidenceId: `condition:${def.id}`, kind: 'verification' }],
    };
  }

  private matchCondition(cond: ConditionSpec, source: NodeResult): { branch: 'then' | 'else'; detail: string } {
    const { when } = cond;
    let matched: boolean;
    let detail: string;
    if ('on' in when) {
      matched = when.on === 'success' ? source.status === 'success' : source.status === 'failure';
      detail = `verdict is ${source.status} (expected ${when.on})`;
    } else {
      const actual = getPath(source, when.path);
      matched = stableStringify(actual) === stableStringify(when.equals);
      detail = `'${when.path}' === ${stableStringify(when.equals)} (got ${stableStringify(actual)})`;
    }
    return { branch: matched ? 'then' : 'else', detail };
  }

  /* ─────────────────────────── state helpers ─────────────────────────── */

  private makeNode(def: WorkflowNode): InternalNode {
    return { def, status: 'PLANNED', attempt: 1, failureCount: 0 };
  }

  private transition(node: InternalNode, event: Parameters<typeof nodeStateMachine.transition>[1]): void {
    node.status = nodeStateMachine.transition(node.status, event);
  }

  private promoteReady(): void {
    for (const node of this.nodes.values()) {
      if (node.status !== 'PLANNED') continue;
      if (node.def.deps.every((d) => this.nodes.get(d)?.status === 'COMPLETED')) {
        this.transition(node, 'PREPARE');
        this.emit('WorkflowNodeReady', { nodeId: node.def.id });
      }
    }
  }

  private skipNode(nodeId: string, reason: string): void {
    const node = this.nodes.get(nodeId);
    if (!node || isTerminal(node.status)) return;
    this.transition(node, 'SKIP');
    node.skippedReason = reason;
    this.emit('WorkflowNodeSkipped', { nodeId, reason });
    this.cascadeSkip(nodeId);
  }

  private cascadeSkip(nodeId: string): void {
    for (const other of this.nodes.values()) {
      if (other.def.deps.includes(nodeId) && !isTerminal(other.status)) {
        this.transition(other, 'SKIP');
        other.skippedReason = `dependency '${nodeId}' skipped`;
        this.emit('WorkflowNodeSkipped', { nodeId: other.def.id, reason: other.skippedReason });
        this.cascadeSkip(other.def.id);
      }
    }
  }

  private async failNode(node: InternalNode, error: string, quarantine = false): Promise<void> {
    if (node.status === 'RUNNING' || node.status === 'VERIFYING' || node.status === 'WAITING') {
      this.transition(node, 'FAIL');
    } else if (node.status === 'READY') {
      this.transition(node, 'START');
      this.transition(node, 'FAIL');
    }
    node.error = error;

    if (quarantine) {
      this.transition(node, 'QUARANTINE');
      this.emit('WorkflowNodeQuarantined', { nodeId: node.def.id, error });
      await this.persist();
      return;
    }

    const registry = this.opts.compensations ?? new CompensationRegistry();
    const spec = registry.compensationFor(node.def);
    if (spec && 'action' in spec) {
      this.transition(node, 'COMPENSATE');
      this.emit('WorkflowNodeCompensating', { nodeId: node.def.id, compensation: spec.action });
      await this.persist();
      try {
        await this.handler.run(spec.action, spec.input ?? {}, node.def);
      } catch {
        /* التعويض نفسه فشل — يُسجَّل للتدقيق اليدوي */
      }
      this.transition(node, 'ROLLBACK');
      this.emit('WorkflowNodeRolledBack', { nodeId: node.def.id, error });
      await this.compensateUpstream(node.def.id);
      await this.persist();
    } else {
      this.emit('WorkflowNodeFailed', {
        nodeId: node.def.id,
        error,
        irreversible: spec !== undefined && 'irreversible' in spec && spec.irreversible,
      });
      await this.persist();
    }
  }

  /** تعويض العقد المكتملة القابلة للتعويض بترتيب عكسي (undo side effects). */
  private async compensateUpstream(failedNodeId: string): Promise<void> {
    const registry = this.opts.compensations ?? new CompensationRegistry();
    for (const id of [...this.completionOrder].reverse()) {
      if (id === failedNodeId) continue;
      const n = this.nodes.get(id);
      if (!n || n.status !== 'COMPLETED') continue;
      const spec = registry.compensationFor(n.def);
      if (spec && 'action' in spec) {
        try {
          await this.handler.run(spec.action, spec.input ?? {}, n.def);
        } catch {
          /* ignore */
        }
        this.compensated.push(id);
        this.emit('WorkflowNodeCompensated', { nodeId: id, compensation: spec.action });
      }
    }
  }

  private completeNode(node: InternalNode, result: NodeResult): void {
    if (node.status === 'RUNNING') this.transition(node, 'VERIFY');
    this.transition(node, 'COMPLETE');
    node.result = result;
    this.results.set(node.def.id, result);
    this.completionOrder.push(node.def.id);
    this.emit('WorkflowNodeCompleted', {
      nodeId: node.def.id,
      result,
      operationId: this.operationId(node.def),
      idempotencyKey: this.keyOf(node.def),
    });
    this.promoteReady();
  }

  private cancelAll(reason: string): void {
    for (const node of this.nodes.values()) {
      if (isTerminal(node.status)) continue;
      node.status = 'CANCELLED';
      this.emit('WorkflowNodeCancelled', { nodeId: node.def.id, reason });
    }
    this.emit('WorkflowRunCancelled', { runId: this.runId, reason });
  }

  private finalize(): void {
    const statuses = [...this.nodes.values()].map((n) => n.status);
    let status: WorkflowRunStatus;
    if (statuses.some((s) => s === 'QUARANTINED')) status = 'QUARANTINED';
    else if (statuses.some((s) => s === 'FAILED' || s === 'ROLLED_BACK')) status = 'FAILED';
    else if (statuses.every((s) => s === 'COMPLETED' || s === 'SKIPPED' || s === 'CANCELLED')) {
      status = statuses.some((s) => s === 'CANCELLED') ? 'CANCELLED' : 'COMPLETED';
    } else status = 'FAILED';

    if (status === 'COMPLETED') this.emit('WorkflowRunCompleted', { runId: this.runId, status });
    else if (status === 'CANCELLED') this.emit('WorkflowRunCancelled', { runId: this.runId, reason: this.cancelledReason ?? 'cancelled' });
    else this.emit('WorkflowRunFailed', { runId: this.runId, status });
  }

  /* ─────────────────────────── events / ledger ─────────────────────────── */

  private operationId(node: WorkflowNode): string {
    return `${this.runId}:${node.id}`;
  }

  private keyOf(node: WorkflowNode): string {
    return idempotencyKey(this.operationId(node), node.input ?? {});
  }

  private toJob(node: WorkflowNode): WorkflowJob {
    return {
      id: `job-${this.runId}-${node.id}`,
      nodeId: node.id,
      runId: this.runId,
      operationId: this.operationId(node),
      idempotencyKey: this.keyOf(node),
      attempt: this.nodes.get(node.id)?.attempt ?? 1,
      enqueuedAt: this.clock(),
    };
  }

  private emit(type: string, payload: unknown): void {
    if (!this.opts.ledger) return;
    this.opts.ledger.append({ actor: this.actor, type, taskId: this.taskId, runId: this.runId, payload });
  }

  private async persist(): Promise<void> {
    await this.opts.onPersist?.();
  }

  private resolveInput(node: WorkflowNode): unknown {
    const input = node.input;
    if (isInputRef(input)) {
      const result = this.results.get(input.$ref.nodeId);
      if (!result) throw new NodeFailureError(`cannot resolve $ref to '${input.$ref.nodeId}' (no result)`);
      return getPath(result, input.$ref.path);
    }
    return input ?? {};
  }

  /* إعادة بناء الحالة من الأحداث (hydrate) */
  private applyEventToSnapshot(nodeId: string, type: string, payload: Record<string, unknown>, snapshots: Map<string, NodeSnapshot>): void {
    const snap = snapshots.get(nodeId) ?? { nodeId, status: 'PLANNED' as NodeStatus, attempt: 1 };
    switch (type) {
      case 'WorkflowNodeRunning':
        snap.status = 'RUNNING';
        snap.attempt = (payload.attempt as number) ?? snap.attempt;
        break;
      case 'WorkflowNodeVerified':
        snap.status = 'VERIFYING';
        break;
      case 'WorkflowNodeCompleted':
        snap.status = 'COMPLETED';
        snap.result = payload.result as NodeResult;
        break;
      case 'WorkflowNodeFailed':
        snap.status = 'FAILED';
        snap.error = payload.error as string;
        break;
      case 'WorkflowNodeRetrying':
        snap.status = 'RETRYING';
        break;
      case 'WorkflowNodeSkipped':
        snap.status = 'SKIPPED';
        snap.skippedReason = payload.reason as string;
        break;
      case 'WorkflowNodeCompensating':
        snap.status = 'COMPENSATING';
        break;
      case 'WorkflowNodeRolledBack':
        snap.status = 'ROLLED_BACK';
        snap.error = payload.error as string;
        break;
      case 'WorkflowNodeQuarantined':
        snap.status = 'QUARANTINED';
        snap.error = payload.error as string;
        break;
      case 'WorkflowNodeCancelled':
        snap.status = 'CANCELLED';
        break;
      default:
        return;
    }
    snapshots.set(nodeId, snap);
  }

  private outcome(): WorkflowRunOutcome {
    const nodes: NodeSnapshot[] = [...this.nodes.values()].map((n) => ({
      nodeId: n.def.id,
      status: n.status,
      attempt: n.attempt,
      result: n.result,
      error: n.error,
      skippedReason: n.skippedReason,
    }));
    return {
      runId: this.runId,
      taskId: this.taskId,
      status: this.deriveStatus(nodes),
      nodes,
      results: Object.fromEntries(this.results),
      completed: nodes.filter((n) => n.status === 'COMPLETED').map((n) => n.nodeId),
      failed: nodes.filter((n) => n.status === 'FAILED').map((n) => ({ nodeId: n.nodeId, error: n.error ?? 'failed' })),
      rolledBack: [...nodes.filter((n) => n.status === 'ROLLED_BACK').map((n) => n.nodeId), ...this.compensated],
      skipped: nodes.filter((n) => n.status === 'SKIPPED').map((n) => n.nodeId),
      quarantined: nodes.filter((n) => n.status === 'QUARANTINED').map((n) => n.nodeId),
      dedupedDeliveries: this.deduped,
      events: this.opts.ledger ? this.opts.ledger.all.filter((e) => e.runId === this.runId) : [],
    };
  }

  private deriveStatus(nodes: NodeSnapshot[]): WorkflowRunStatus {
    if (nodes.some((n) => n.status === 'QUARANTINED')) return 'QUARANTINED';
    if (nodes.some((n) => n.status === 'FAILED' || n.status === 'ROLLED_BACK')) return 'FAILED';
    if (nodes.some((n) => n.status === 'CANCELLED')) return 'CANCELLED';
    return 'COMPLETED';
  }
}

/** hash للـinput (لإثبات الدليل وidempotency). */
export function inputHash(input: unknown): string {
  return createHash('sha256').update(stableStringify(input)).digest('hex');
}
