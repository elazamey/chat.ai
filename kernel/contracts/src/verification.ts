import type { Actor } from './actor';
import type { EvidenceRef } from './events';

export type Verdict = 'PENDING' | 'PASSED' | 'FAILED' | 'UNKNOWN';

/** ادعاء إنجاز من Agent — لا يُصدَّق حتى يُتحقق منه (C7). */
export interface Claim {
  id: string;
  statement: string; // "تم نشر المشروع"
  taskId: string;
  madeBy: Actor;
  at: string;
}

/** فحص واحد ضمن التحقق، مربوط بدليل. */
export interface VerificationCheck {
  id: string;
  name: string; // 'healthcheck' | 'tests_pass' | 'version_matches_commit' | ...
  verdict: Verdict;
  evidence?: EvidenceRef[];
  detail?: string;
}

/** التحقق الكامل: Claim → Evidence → Verification (C8). */
export interface Verification {
  id: string;
  target: string;
  checks: VerificationCheck[];
  evidence: EvidenceRef[];
  verdict: Verdict;
}
