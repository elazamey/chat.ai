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
