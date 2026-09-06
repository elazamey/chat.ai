import { describe, it, expect } from 'vitest';
import { MockProvider, MOCK_MODEL, byokCredentials, managedCredentials, noCredentials } from './index';
import { ModelRouter } from './index';
import type { SecretRef } from '@aok/contracts';

describe('MockProvider ($0 deterministic model)', () => {
  it('is discoverable via the ModelRouter at zero cost', () => {
    const router = new ModelRouter([new MockProvider()]);
    const model = router.choose({ taskType: 'planning' });
    expect(model.id).toBe('mock-1');
    expect(model.costPer1kInputUsd).toBe(0);
  });

  it('generates a deterministic plan for planning tasks', async () => {
    const p = new MockProvider();
    const res = await p.invoke({ taskType: 'planning' });
    const parsed = JSON.parse(res.content) as { plan: string[] };
    expect(parsed.plan).toEqual(['repo.read', 'test.run', 'github.pull_request.create']);
  });

  it('generates a stable response otherwise', async () => {
    const p = new MockProvider();
    const res = await p.invoke({ taskType: 'coding' });
    expect(res.content).toBe('mock response (deterministic, $0)');
  });

  it('streams', async () => {
    const p = new MockProvider();
    const chunks = [];
    for await (const c of p.stream({ taskType: 'planning' })) chunks.push(c);
    expect(chunks).toHaveLength(1);
  });
});

describe('BYOK credentials (ECONOMIC PRINCIPLE 009)', () => {
  const ref: SecretRef = { id: 's1', vault: 'in-memory', key: 'gemini-key' };

  it('holds a SecretRef, never a raw key (RULE 007)', () => {
    const creds = byokCredentials(ref);
    expect(JSON.stringify(creds)).not.toContain('AIza'); // لا مفتاح خام
    expect(creds).toEqual({ kind: 'byok', secretRef: ref });
  });

  it('supports managed and none credential modes', () => {
    expect(managedCredentials('pro')).toEqual({ kind: 'managed', plan: 'pro' });
    expect(noCredentials()).toEqual({ kind: 'none' });
  });
});
