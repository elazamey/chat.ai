import type {
  BudgetPolicy,
  QuotaPolicy,
  Usage,
  UsageEvent,
  UsageIncrement,
  UsageMeter,
  UsageResource,
  QuotaSubject,
  UsagePlan,
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

  constructor(private readonly onRecord?: (event: UsageEvent, usage: Usage) => void) {}

  record(event: UsageEvent): void {
    this.total[event.resource] += event.amount;
    this.events.push(event);
    this.onRecord?.(event, this.usage());
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

export const FREE_PLAN: UsagePlan = {
    id: 'free',
    billingRequired: false,
    budget: {
      maxExecutionSeconds: 300,
      maxToolCalls: 100,
      maxModelCalls: 20,
      maxNetworkRequests: 20,
      maxRuns: 10,
    },
};

export const BYOK_PLAN: UsagePlan = {
    id: 'byok',
    billingRequired: false,
    budget: {
      maxExecutionSeconds: 3_600,
      maxToolCalls: 1_000,
      maxModelCalls: 200,
      maxNetworkRequests: 200,
      maxRuns: 100,
    },
};

export class PlanCatalog {
    constructor(private readonly plans: readonly UsagePlan[] = [FREE_PLAN, BYOK_PLAN]) {}

    get(id: UsagePlan['id']): UsagePlan {
      const plan = this.plans.find((candidate) => candidate.id === id);
      if (!plan) throw new Error(`unknown usage plan: ${id}`);
      return plan;
    }
}

/** Tenant-scoped quota state; callers must check before dispatching external work. */
export class TenantQuota {
    private readonly usageByTenant = new Map<string, Usage>();

  constructor(private readonly plans = new PlanCatalog()) {}

  usage(subject: QuotaSubject): Usage {
    return this.usageByTenant.get(subject.tenantId) ?? { total: { ...EMPTY } };
  }

  allows(subject: QuotaSubject, planId: UsagePlan['id'], increment: UsageIncrement): { allowed: boolean; reason: string } {
    return new BudgetQuota(this.plans.get(planId).budget).allows(this.usage(subject), increment);
  }

  record(subject: QuotaSubject, event: UsageEvent): void {
    const current = this.usage(subject);
    current.total[event.resource] += event.amount;
    this.usageByTenant.set(subject.tenantId, current);
  }
}
