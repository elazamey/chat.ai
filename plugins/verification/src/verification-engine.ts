import { randomUUID } from 'node:crypto';
import type { Claim, Verification, VerificationCheck, Verdict } from '@aok/contracts';

/**
 * يشتق الحكم النهائي من الفحوص (C8):
 * - أي FAILED → FAILED
 * - الكل PASSED (وغير فارغ) → PASSED
 * - غير ذلك → UNKNOWN
 */
export function deriveVerdict(checks: VerificationCheck[]): Verdict {
  if (checks.length === 0) return 'UNKNOWN';
  if (checks.some((c) => c.verdict === 'FAILED')) return 'FAILED';
  if (checks.every((c) => c.verdict === 'PASSED')) return 'PASSED';
  return 'UNKNOWN';
}

/**
 * محرك التحقق (C7/C8 / ADR-0005): "تم بنجاح" ممنوع.
 * لا يمكن أن يكون الحكم PASSED بدون دليل (Evidence) — هذا يدفن الـ"done".
 */
export class VerificationEngine {
  verify(target: string, checks: VerificationCheck[]): Verification {
    const evidence = checks.flatMap((c) => c.evidence ?? []);
    let verdict = deriveVerdict(checks);
    if (verdict === 'PASSED' && evidence.length === 0) {
      verdict = 'UNKNOWN'; // ادعاء بلا دليل لا يُقبل
    }
    return { id: randomUUID(), target, checks, evidence, verdict };
  }

  /** يتحقق من ادعاء Agent: الادعاء لا يُصدَّق، الفحوص والأدلة هي الحكم. */
  verifyClaim(claim: Claim, checks: VerificationCheck[]): Verification {
    const v = this.verify(claim.statement, checks);
    return { ...v, target: claim.statement };
  }
}
