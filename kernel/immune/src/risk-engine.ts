import type { Detection, RiskReason, RiskScore, RiskSeverity } from './types';

/**
 * الـRisk Engine (IMMUNE §3): لا `attack = yes/no`، بل درجة 0..100
 * مع ثقة وأسباب وشدّة. الدرجة قرار تشغيل آلي وليس حكمًا قضائيًا.
 */
export class RiskEngine {
  evaluate(detections: Detection[]): RiskScore {
    const reasons: RiskReason[] = detections.map((d) => ({
      kind: d.kind,
      detail: d.detail,
      weight: d.weight,
    }));

    const raw = reasons.reduce((sum, r) => sum + r.weight, 0);
    const score = clamp(Math.round(raw), 0, 100);
    const confidence = detections.length === 0 ? 1 : clamp(0.5 + Math.min(0.5, detections.length * 0.15), 0, 1);

    return { score, confidence, reasons, severity: severityOf(score) };
  }

  /** الشدّة من الدرجة — نفس عتبات عقد المناعة. */
  severityOf(score: number): RiskSeverity {
    if (score >= 90) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
}

export function severityOf(score: number): RiskSeverity {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
