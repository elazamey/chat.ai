/**
 * الأسرار خارج الـKernel (C10): النواة تعرف المرجع فقط،
 * والقيمة تصل عبر Vault كـcredential قصير العمر وقت التنفيذ.
 */
export interface SecretRef {
  id: string;
  vault: string; // 'in-memory' | '1password' | 'aws-kms' | 'hashicorp' | ...
  key: string;
}

export interface ShortLivedCredential {
  value: string;
  expiresAt: string; // ISO-8601
}

/**
 * واجهة الـVault (C10): النواة تحمل SecretRef فقط،
 * والقيمة تصل كـcredential قصير العمر وقت التنفيذ.
 * التنفيذات: in-memory (dev) / 1Password / AWS KMS / HashiCorp Vault.
 */
export interface VaultAdapter {
  resolve(ref: SecretRef, principal: string): Promise<ShortLivedCredential>;
}
