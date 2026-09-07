import { IMMUNITY_ORDER, type ImmunityLevel, type ImmunityMetrics, type SystemHealth } from './types';

/**
 * Health Model (IMMUNE §27) — ليس `{"status":"ok"}` فقط:
 *   { status, kernel, immune, ledger, storage, runners, incidents }
 */
export class HealthModel {
  snapshot(input: {
    level: ImmunityLevel;
    ledgerHealthy: boolean;
    storageHealthy: boolean;
    kernelHealthy: boolean;
    runners: { healthy: number; quarantined: number };
    incidents: number;
  }): SystemHealth {
    const order = IMMUNITY_ORDER[input.level];
    const status: SystemHealth['status'] =
      order >= 4 ? 'locked' : order === 3 ? 'critical' : order >= 1 || input.runners.quarantined > 0 || input.incidents > 0 ? 'degraded' : 'healthy';
    const immune: SystemHealth['immune'] =
      order >= 4 ? 'locked' : order === 3 ? 'quarantined' : order >= 1 ? 'active' : 'watch';
    return {
      status,
      kernel: input.kernelHealthy ? 'healthy' : 'degraded',
      immune,
      ledger: input.ledgerHealthy ? 'healthy' : 'degraded',
      storage: input.storageHealthy ? 'healthy' : 'degraded',
      runners: { ...input.runners },
      incidents: input.incidents,
      level: input.level,
    };
  }
}

/** متوسط زمني بسيط. */
function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Immunity Metrics (IMMUNE §28): MTTD / MTTC / MTTR + عدّادات.
 * الهدف ليس "منع 100% من الاختراق" بل: اكتشاف مبكر + احتواء سريع + أثر محدود + تعافٍ موثوق.
 */
export class MetricsCollector {
  private detectDeltas: number[] = [];
  private containDeltas: number[] = [];
  private recoverDeltas: number[] = [];
  private lastDetection = 0;
  private lastContainment = 0;

  private incidents = 0;
  private falsePositives = 0;
  private policyViolations = 0;
  private quarantines = 0;
  private recoveries = 0;
  private recoveryFailures = 0;
  private integrityFailures = 0;
  private revocations = 0;
  private kills = 0;

  incidentOpened(): void {
    this.incidents += 1;
    this.lastDetection = Date.now();
  }

  detected(): void {
    const now = Date.now();
    this.detectDeltas.push(Math.max(0, now - this.lastDetection));
    this.lastDetection = now;
  }

  contained(): void {
    const now = Date.now();
    this.containDeltas.push(Math.max(0, now - this.lastDetection));
    this.lastContainment = now;
  }

  recovered(success: boolean): void {
    const now = Date.now();
    this.recoverDeltas.push(Math.max(0, now - this.lastContainment));
    if (success) this.recoveries += 1;
    else this.recoveryFailures += 1;
  }

  recordPolicyViolation(): void {
    this.policyViolations += 1;
  }
  recordQuarantine(): void {
    this.quarantines += 1;
  }
  recordIntegrityFailure(): void {
    this.integrityFailures += 1;
  }
  recordCredentialRevocation(): void {
    this.revocations += 1;
  }
  recordKill(): void {
    this.kills += 1;
  }
  recordFalsePositive(): void {
    this.falsePositives += 1;
  }

  compute(): ImmunityMetrics {
    const attempts = this.recoveries + this.recoveryFailures;
    return {
      mttdMs: Math.round(mean(this.detectDeltas)),
      mttcMs: Math.round(mean(this.containDeltas)),
      mttrMs: Math.round(mean(this.recoverDeltas)),
      incidentCount: this.incidents,
      falsePositiveRate: this.incidents === 0 ? 0 : this.falsePositives / this.incidents,
      policyViolations: this.policyViolations,
      quarantineCount: this.quarantines,
      recoverySuccess: this.recoveries,
      recoveryAttempts: attempts,
      integrityFailures: this.integrityFailures,
      credentialRevocations: this.revocations,
      kills: this.kills,
    };
  }
}
