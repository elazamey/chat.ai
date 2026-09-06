import type { SecretRef, VaultAdapter } from '@aok/contracts';

/**
 * BYOK / الأسرار خارج النواة (RULE 007 / ECONOMIC PRINCIPLE 009):
 * الـGitHub Adapter يحمل SecretRef فقط، ويسترد الـtoken
 * كـcredential قصير العمر من الـVault وقت التنفيذ — لا يرى السر الخام.
 */
export async function resolveToken(
  ref: SecretRef,
  vault: VaultAdapter,
  principal: string,
): Promise<string> {
  const credential = await vault.resolve(ref, principal);
  return credential.value;
}

/** مصادر الـtoken (للـCLI/E2E): من الـVault أو من بيئة التشغيل (مطوّر). */
export function tokenFromEnv(): string | undefined {
  return process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
}
