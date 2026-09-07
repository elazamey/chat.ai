/**
 * الـEconomic Kernel (ZERO_COST_ECONOMIC_CONTRACT):
 * النواة تقيس وتطبّق الحدود فقط؛ الـBilling خارج النواة.
 */

export type UsageResource =
  | 'execution_seconds'
  | 'tool_calls'
  | 'model_calls'
  | 'network_requests'
  | 'tokens'
  | 'runs';

export interface UsageEvent {
  resource: UsageResource;
  amount: number;
  at: number; // epoch ms
  actorId: string;
  runId: string;
  note?: string;
}

export interface Usage {
  total: Record<UsageResource, number>;
}

/** ميزانية صريحة لكل مورد مُقاس (ECONOMIC PRINCIPLE 005). */
export interface BudgetPolicy {
  maxExecutionSeconds: number;
  maxToolCalls: number;
  maxModelCalls: number;
  maxNetworkRequests: number;
  maxTokens?: number;
  maxRuns?: number;
  maxEstimatedCostUsd?: number;
}

export interface UsageIncrement {
  resource: UsageResource;
  amount: number;
}

export interface QuotaDecision {
  allowed: boolean;
  reason: string;
}

/** يقيّم حدًّا مقابل ميزانية (يُنفَّذ في kernel/economics). */
export interface QuotaPolicy {
  allows(current: Usage, increment: UsageIncrement): QuotaDecision;
}

/** يقيس الاستخدام (يُنفَّذ في kernel/economics). */
export interface UsageMeter {
  record(event: UsageEvent): void;
  usage(): Usage;
}

/** تقرير الفوترة — adapter خارجي (Stripe/PayPal لاحقًا)، ليس داخل النواة. */
export interface BillingAdapter {
  report(usage: Usage): Promise<void>;
}
