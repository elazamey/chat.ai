import type { ZodTypeAny } from 'zod';
import type { Capability } from './capabilities';
import type { LedgerEvent, LedgerEventDraft } from './events';
import type { PolicyDecision } from './policy';
import type { Claim } from './verification';

/** واجهة كتابة الـLedger (ينفّذها @aok/ledger). */
export interface LedgerSink {
  append(draft: LedgerEventDraft): LedgerEvent;
}

/** واجهة تقييم الصلاحيات (ينفّذها @aok/policy). */
export interface PolicyEvaluator {
  evaluate(principal: string, capability: Capability, scope?: string): PolicyDecision;
}

/** واجهة استدعاء الأدوات (ينفّذها @aok/tools). */
export interface ToolInvoker {
  invoke(id: string, input: unknown, ctx: unknown): Promise<{ output: unknown }>;
}

/** سياق تنفيذ الـAgent داخل عقدة. */
export interface AgentContext {
  runId: string;
  taskId: string;
  nodeId: string;
  params: unknown;
  ledger: LedgerSink;
  policy: PolicyEvaluator;
  tools: ToolInvoker;
}

export interface AgentResult {
  status: 'SUCCEEDED' | 'FAILED' | 'NEEDS_APPROVAL';
  output?: unknown;
  claims?: Claim[];
}

/** عقد الـAgent كـPlugin (C3). الـKernel لا يعرف تنفيذه، يعرف عقده فقط. */
export interface AgentContract {
  id: string;
  version: string;
  capabilities: Capability[]; // ما يمكنه طلبه
  permissions: Capability[]; // ما يُمنَح افتراضيًا (يخضع للـPolicy دائمًا)
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
  execute(ctx: AgentContext): Promise<AgentResult>;
}
