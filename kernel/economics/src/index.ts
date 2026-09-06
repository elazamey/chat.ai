import type {
  BudgetPolicy,
  QuotaPolicy,
  Usage,
  UsageEvent,
  UsageIncrement,
  UsageMeter,
  UsageResource,
} from '@aok/contracts';

const EMPTY: Record<UsageResource, number> = {
  execution_seconds: 0,
  tool_calls: 0,
  model_calls: 0,
  network_requests: 0,
  tokens: 0,
  runs: 0,
};

/** مقياس استخدام في الذاكرة (للـlocal/dev؛ Postgres لاحقًا خلف نفس العقد). */
export class InMemoryUsageMeter implements UsageMeter {
  private total: Record<UsageResource, number> = { ...EMPTY };
  private events: UsageEvent[] = [];

  record(event: UsageEvent): void {
    this.total[event.resource] += event.amount;
    this.events.push(event);
  }

  usage(): Usage {
    return { total: { ...this.total } };
  }

  history(): UsageEvent[] {
    return [...this.events];
  }
}

/**
 * تطبيق الميزانية: يرفض أي زيادة تتجاوز الحد (ECONOMIC PRINCIPLE 005).
 * هذا يحمي هامش الربح ويحمي المستخدم معًا.
 */
export class BudgetQuota implements QuotaPolicy {
  constructor(private budget: BudgetPolicy) {}

  allows(current: Usage, increment: UsageIncrement): { allowed: boolean; reason: string } {
    const limit = this.limitFor(increment.resource);
    if (limit === undefined) return { allowed: true, reason: 'unmetered resource' };
    const next = (current.total[increment.resource] ?? 0) + increment.amount;
    if (next > limit) {
      return { allowed: false, reason: `${increment.resource} quota exceeded (${next} > ${limit})` };
    }
    return { allowed: true, reason: 'within budget' };
  }

  private limitFor(resource: UsageResource): number | undefined {
    switch (resource) {
      case 'execution_seconds':
        return this.budget.maxExecutionSeconds;
      case 'tool_calls':
        return this.budget.maxToolCalls;
      case 'model_calls':
        return this.budget.maxModelCalls;
      case 'network_requests':
        return this.budget.maxNetworkRequests;
      case 'tokens':
        return this.budget.maxTokens;
      case 'runs':
        return this.budget.maxRuns;
      default:
        return undefined;
    }
  }
}
