import type { SecretRef, ShortLivedCredential } from '@aok/contracts';

/**
 * واجهة الـVault (C10): النواة تحمل SecretRef فقط،
 * والقيمة تصل كـcredential قصير العمر وقت التنفيذ.
 * المحولات: in-memory (dev) / 1Password / AWS KMS / HashiCorp Vault (لاحقًا).
 */
export interface VaultAdapter {
  resolve(ref: SecretRef, principal: string): Promise<ShortLivedCredential>;
}

export class SecretNotFoundError extends Error {
  constructor(readonly ref: SecretRef) {
    super(`secret '${ref.key}' not found in vault '${ref.vault}'`);
    this.name = 'SecretNotFoundError';
  }
}

/** Vault في الذاكرة للـdev/test فقط (ليس للإنتاج). */
export class InMemoryVault implements VaultAdapter {
  private secrets = new Map<string, string>();
  private ttlMs: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  /** يُعيد مرجعًا فقط — لا يعيد القيمة أبدًا. */
  put(key: string, value: string, vault = 'in-memory'): SecretRef {
    this.secrets.set(`${vault}:${key}`, value);
    return { id: `${vault}:${key}`, vault, key };
  }

  async resolve(ref: SecretRef, _principal: string): Promise<ShortLivedCredential> {
    const value = this.secrets.get(`${ref.vault}:${ref.key}`);
    if (value === undefined) throw new SecretNotFoundError(ref);
    return { value, expiresAt: new Date(Date.now() + this.ttlMs).toISOString() };
  }
}

/**
 * يزيل القيم السرية من أي بنية (logs/ledger payload) قبل التسجيل،
 * لضمان أن الأسرار لا تدخل الـLedger أبدًا (C10).
 */
export function redactSecrets(value: unknown, secrets: string[]): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const s of secrets) {
      if (s) out = out.split(s).join('[REDACTED]');
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, secrets));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactSecrets(v, secrets);
    }
    return out;
  }
  return value;
}
