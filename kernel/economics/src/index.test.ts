import { describe, it, expect } from 'vitest';
import { InMemoryUsageMeter, BudgetQuota, BYOK_PLAN, FREE_PLAN, PlanCatalog, TenantQuota } from './index';
import type { BudgetPolicy } from '@aok/contracts';

const budget: BudgetPolicy = {
  maxExecutionSeconds: 60,
  maxToolCalls: 3,
  maxModelCalls: 2,
  maxNetworkRequests: 5,
};

describe('InMemoryUsageMeter', () => {
  it('accumulates usage per resource', () => {
    const m = new InMemoryUsageMeter();
    m.record({ resource: 'tool_calls', amount: 1, at: 1, actorId: 'a', runId: 'r' });
    m.record({ resource: 'tool_calls', amount: 2, at: 2, actorId: 'a', runId: 'r' });
    m.record({ resource: 'model_calls', amount: 1, at: 3, actorId: 'a', runId: 'r' });
    expect(m.usage().total.tool_calls).toBe(3);
    expect(m.usage().total.model_calls).toBe(1);
  });

  it('keeps a history of usage events (audit)', () => {
    const m = new InMemoryUsageMeter();
    m.record({ resource: 'runs', amount: 1, at: 1, actorId: 'a', runId: 'r' });
    expect(m.history()).toHaveLength(1);
  });

  it('notifies an audit sink after each usage event is recorded', () => {
    const recorded: number[] = [];
    const m = new InMemoryUsageMeter((_event, usage) => recorded.push(usage.total.tool_calls));
    m.record({ resource: 'tool_calls', amount: 1, at: 1, actorId: 'a', runId: 'r' });
    m.record({ resource: 'tool_calls', amount: 2, at: 2, actorId: 'a', runId: 'r' });
    expect(recorded).toEqual([1, 3]);
  });
});

describe('BudgetQuota', () => {
  it('allows within budget and rejects over budget', () => {
    const q = new BudgetQuota(budget);
    const current = { total: { tool_calls: 2 } as never };
    expect(q.allows(current, { resource: 'tool_calls', amount: 1 }).allowed).toBe(true);
    expect(q.allows(current, { resource: 'tool_calls', amount: 2 }).allowed).toBe(false);
  });

  describe('plans and tenant quotas', () => {
    it('exposes explicit free and BYOK plans', () => {
      const plans = new PlanCatalog();
      expect(plans.get('free')).toEqual(FREE_PLAN);
      expect(plans.get('byok')).toEqual(BYOK_PLAN);
    });

    it('tracks and enforces usage independently per tenant', () => {
      const quotas = new TenantQuota();
      const subject = { tenantId: 'tenant-a', userId: 'user-a' };
      quotas.record(subject, { resource: 'tool_calls', amount: 1, at: 1, actorId: 'user-a', runId: 'run-a' });
      expect(quotas.usage(subject).total.tool_calls).toBe(1);
      expect(quotas.usage({ tenantId: 'tenant-b' }).total.tool_calls).toBe(0);
      expect(quotas.allows(subject, 'free', { resource: 'tool_calls', amount: 99 }).allowed).toBe(true);
      expect(quotas.allows(subject, 'free', { resource: 'tool_calls', amount: 100 }).allowed).toBe(false);
    });
  });

  it('maps each resource to its budget field', () => {
    const q = new BudgetQuota(budget);
    const zero = { total: { model_calls: 0 } as never };
    expect(q.allows(zero, { resource: 'model_calls', amount: 2 }).allowed).toBe(true);
    expect(q.allows(zero, { resource: 'model_calls', amount: 3 }).allowed).toBe(false);
  });

  it('treats unmetered optional resources as allowed', () => {
    const q = new BudgetQuota(budget);
    const zero = { total: { tokens: 0 } as never };
    expect(q.allows(zero, { resource: 'tokens', amount: 9999 }).allowed).toBe(true);
  });

  it('enforces runs quota when defined', () => {
    const q = new BudgetQuota({ ...budget, maxRuns: 2 });
    const current = { total: { runs: 2 } as never };
    expect(q.allows(current, { resource: 'runs', amount: 1 }).allowed).toBe(false);
  });
});
