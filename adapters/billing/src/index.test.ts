import { describe, it, expect } from 'vitest';
import { NoopBillingAdapter, InMemoryBillingAdapter, MockBillingAdapter } from './index';
import type { Usage } from '@aok/contracts';

const usage: Usage = { total: { execution_seconds: 1, tool_calls: 3, model_calls: 1, network_requests: 0, tokens: 0, runs: 1 } };

describe('billing adapters (external to the kernel)', () => {
  it('NoopBillingAdapter reports without effect', async () => {
    await expect(new NoopBillingAdapter().report(usage)).resolves.toBeUndefined();
  });

  it('InMemoryBillingAdapter collects reports', async () => {
    const b = new InMemoryBillingAdapter();
    await b.report(usage);
    expect(b.reports).toHaveLength(1);
    expect(b.reports[0]!.total.tool_calls).toBe(3);
  });

  it('MockBillingAdapter records reports and suspension state without a provider', async () => {
    const b = new MockBillingAdapter();
    await b.report(usage);
    b.suspend('tenant-a');
    expect(b.reports).toHaveLength(1);
    expect(b.suspended.has('tenant-a')).toBe(true);
  });
});
