import { blastRadiusScore, type BlastRadius, type RiskScore } from './types';

/**
 * Blast Radius (IMMUNE §23): قبل التنفيذ — "ما الذي يمكن أن يتلفه هذا الفعل؟"
 * ثم: risk × blast radius. إذا تجاوز الناتج العتبة → Approval required.
 */
export interface BlastRadiusGate {
  requiresApproval(risk: RiskScore, radius: BlastRadius | undefined, threshold: number): boolean;
  /** الناتج الموزون للمراقبة/الموافقة. */
  product(risk: RiskScore, radius: BlastRadius | undefined): number;
}

export function blastRadiusProduct(risk: RiskScore, radius: BlastRadius | undefined): number {
  return risk.score * blastRadiusScore(radius);
}

export const blastRadiusGate: BlastRadiusGate = {
  requiresApproval(risk, radius, threshold) {
    return blastRadiusScore(radius) > 0 && blastRadiusProduct(risk, radius) >= threshold;
  },
  product(risk, radius) {
    return blastRadiusProduct(risk, radius);
  },
};
