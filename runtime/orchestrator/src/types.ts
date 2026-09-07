import type { Actor, EvidenceRef } from '@aok/contracts';

/**
 * M4 — Workflow Contract (M4.1).
 *
 * الـOrchestrator آلة تنفيذ صغيرة فوق الـKernel (وليس "مديرًا كبيرًا"):
 *
 *   Task → Run → PlanGraph → Scheduler → Node → Job → Capability → Execution → Event → Verification
 *
 * وهو **لا يمتلك** Policy / Ledger / Secrets / Model logic / Tool implementation /
 * Storage internals — بل يستدعي العقود الموجودة (عبر واجهات محقونة).
 *
 * كل الأنواع أدناه قابلة للـserialization (JSON-safe) حتى يمكن إعادة بناء
 * الـgraph من أحداث الـLedger بعد crash (M4.10).
 */

/** حالة العقدة — آلة الحالة في node-machine.ts (مصدر الحقيقة للانتقالات القانونية). */
export type NodeStatus =
  | 'PLANNED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'COMPENSATING'
  | 'ROLLED_BACK'
  | 'QUARANTINED'
  | 'CANCELLED'
  | 'SKIPPED';

export type WorkflowRunStatus = 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'QUARANTINED';

export type WorkflowJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export type WorkflowNodeKind = 'ACTION' | 'CONDITIONAL' | 'APPROVAL';

/** Retry Policy (M4.4): ليست "كرر ثلاث مرات" — backoff + أخطاء قابلة للإعادة + jitter. */
export interface RetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential';
  retryableErrors: string[];
  jitter?: boolean;
}

/** Idempotency (M4.5): كل Job يملك operationId + attempt + idempotencyKey لمنع التكرار. */
export interface JobIdentity {
  operationId: string;
  idempotencyKey: string;
  attempt: number;
}

/** Compensation (M4.8): forward action + compensation action اختيارية.
 *  `irreversible` = عمليات لا يمكن التراجع عنها (email, external mutation, github comment)
 *  فلا ندّعي rollback وهميًا. */
export type CompensationSpec =
  | { action: string; input?: unknown }
  | { irreversible: true };

/** شرط مبني على نتيجة موثّقة (لا نص LLM). */
export type ConditionSpec =
  | { when: { nodeId: string; on: 'success' | 'failure' }; then: string[]; else?: string[] }
  | { when: { nodeId: string; path: string; equals: unknown }; then: string[]; else?: string[] };

/** إحالة إلى نتيجة عقدة سابقة (بدل دالة غير قابلة للـserialization). */
export interface InputRef {
  $ref: { nodeId: string; path: string };
}

export interface ApprovalSpec {
  action: string;
  reason: string;
}

/** عقدة الـWorkflow — الحواف عبر `deps` (DAG)، والتنفيذ المتوازي ضمني (عقد مستقلة). */
export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  /** القدرة (ACTION) أو القدرة موضوع الموافقة (APPROVAL). */
  action?: string;
  /** مدخل: قيمة JSON أو إحالة `{ $ref: { nodeId, path } }` إلى نتيجة موثّقة. */
  input?: unknown;
  deps: string[];
  agentId?: string;
  tenantId?: string;
  toolId?: string;
  retry?: RetryPolicy;
  timeoutMs?: number;
  compensation?: CompensationSpec;
  condition?: ConditionSpec;
  approval?: ApprovalSpec;
}

export type NodeResultStatus = 'success' | 'failure';

/** نتيجة عقدة موثّقة (تحمل أدلتها) — لا نجاح بلا دليل. */
export interface NodeResult {
  status: NodeResultStatus;
  output: unknown;
  evidence: EvidenceRef[];
}

/** حالة عقدة قابلة للـserialization (Snapshot للـhydrate/resume). */
export interface NodeSnapshot {
  nodeId: string;
  status: NodeStatus;
  attempt: number;
  result?: NodeResult;
  error?: string;
  skippedReason?: string;
}

export interface WorkflowRunOutcome {
  runId: string;
  taskId: string;
  status: WorkflowRunStatus;
  nodes: NodeSnapshot[];
  results: Record<string, NodeResult>;
  completed: string[];
  failed: { nodeId: string; error: string }[];
  rolledBack: string[];
  skipped: string[];
  quarantined: string[];
  dedupedDeliveries: number;
  events: LedgerEventLike[];
}

/** الواجهة البنيوية للـLedger (يحقنها الـRunner/الـCLI — DurableLedger يطابقها). */
export interface LedgerLike {
  append<T>(draft: {
    actor: Actor;
    type: string;
    taskId: string;
    runId: string;
    payload: T;
    evidence?: EvidenceRef[];
  }): LedgerEventLike;
  all: LedgerEventLike[];
}

export interface LedgerEventLike {
  type: string;
  taskId: string;
  runId: string;
  payload: unknown;
  seq: number;
}

/** مهمة مجدولة داخل الـDAG Executor (مميزة عن `Job` في عقود النواة). */
export interface WorkflowJob extends JobIdentity {
  id: string;
  nodeId: string;
  runId: string;
  enqueuedAt: number;
}

/** Scheduler مستقل (M4.2) — الـOrchestrator لا يعرف النقل (in-process/SQLite/Postgres/Redis/cloud). */
export interface Scheduler {
  enqueue(job: WorkflowJob): Promise<void>;
  cancel(jobId: string): Promise<void>;
  retry(jobId: string): Promise<void>;
}

/**
 * قائمة استهلاك (pull) — يمتد بها الـScheduler للتنفيذ داخل العملية.
 * النقل البعيد (Postgres `SELECT … FOR UPDATE SKIP LOCKED`, Redis `BRPOP`, cloud queue)
 * يطبق نفس العقد.
 */
export interface JobQueue extends Scheduler {
  dequeue(): WorkflowJob | undefined;
}

/** منفّذ العقدة — يستدعي execute() داخل النواة (Policy → Event → Executor → Result). */
export interface NodeHandler {
  run(action: string, input: unknown, node: WorkflowNode): Promise<NodeResult>;
  /** هل تتطلب القدرة موافقة سياسة (من PolicyEngine)؟ */
  requiresApproval?(action: string): boolean;
  /** موافقة بشرية (ApprovalNode أو قدرة تتطلب موافقة). */
  requestApproval?(req: ApprovalSpec & { nodeId: string }): Promise<boolean>;
  /** تحقق من نتيجة (للعقدة المعلمة بـverify، وللشرط الموثّق). */
  verify?(result: NodeResult, node: WorkflowNode): Promise<{ verdict: 'PASSED' | 'FAILED' | 'UNKNOWN'; detail?: string }>;
}

/** حارس الفشل (تكامل مع Immune System): repeated failure → risk → circuit breaker → stop. */
export interface FailureGuard {
  assess(nodeId: string, failures: number, error: string): { stop: boolean; quarantine: boolean; reason?: string };
}

/** Bulkhead (M4.8) — حدود التزامن مرتبطة بـImmune + Cost Guard. */
export interface BulkheadLimits {
  maxConcurrentJobs: number;
  maxConcurrentPerAgent: number;
  maxConcurrentPerTenant: number;
  maxConcurrentPerTool: number;
}

export const DEFAULT_BULKHEAD: BulkheadLimits = {
  maxConcurrentJobs: 8,
  maxConcurrentPerAgent: 4,
  maxConcurrentPerTenant: 4,
  maxConcurrentPerTool: 4,
};

export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 1,
  backoff: 'fixed',
  retryableErrors: [],
  jitter: false,
};
