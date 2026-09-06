import { describe, it, expect } from 'vitest';
import { InMemoryVault, redactSecrets, SecretNotFoundError } from './index';

describe('InMemoryVault', () => {
  it('returns only a ref on put, and a short-lived credential on resolve', async () => {
    const vault = new InMemoryVault();
    const ref = vault.put('github-token', 'ghp_123456');
    // المرجع لا يحتوي القيمة
    expect(JSON.stringify(ref)).not.toContain('ghp_123456');

    const cred = await vault.resolve(ref, 'agent:coder');
    expect(cred.value).toBe('ghp_123456');
    expect(new Date(cred.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('throws SecretNotFoundError for unknown keys', async () => {
    const vault = new InMemoryVault();
    await expect(vault.resolve({ id: 'x', vault: 'in-memory', key: 'missing' }, 'u')).rejects.toThrow(
      SecretNotFoundError,
    );
  });
});

describe('redactSecrets', () => {
  it('strips secret values from nested structures', () => {
    const secret = 'ghp_123456';
    const out = redactSecrets(
      { cmd: 'echo ghp_123456', nested: { list: ['a', 'ghp_123456'] } },
      [secret],
    );
    expect(JSON.stringify(out)).not.toContain(secret);
    expect(JSON.stringify(out)).toContain('[REDACTED]');
  });
});
