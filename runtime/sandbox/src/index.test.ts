import { describe, it, expect } from 'vitest';
import { InProcessSandboxManager } from './index';

const limits = {
  fsRoot: '/workspace',
  timeoutMs: 50,
  networkPolicy: 'allowlist' as const,
  networkDomains: ['api.github.com'],
};

describe('InProcessSandboxManager', () => {
  it('allocates, runs and releases sandboxes', async () => {
    const mgr = new InProcessSandboxManager();
    const sb = await mgr.allocate(limits);
    const out = await sb.run(async () => 'ok');
    expect(out).toBe('ok');
    expect(mgr.activeCount()).toBe(1);
    await mgr.release(sb.id);
    expect(mgr.activeCount()).toBe(0);
  });

  it('enforces the timeout', async () => {
    const mgr = new InProcessSandboxManager();
    const sb = await mgr.allocate({ ...limits, timeoutMs: 10 });
    await expect(sb.run(() => new Promise((r) => setTimeout(r, 100)))).rejects.toThrow(/timeout/);
    await mgr.release(sb.id);
  });
});
