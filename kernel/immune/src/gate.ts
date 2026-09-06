import { Detector } from './detector';
import { RiskEngine } from './risk-engine';
import { PolicyFirewall } from './policy-firewall';
import { blastRadiusGate } from './blast-radius';
import {
  DEFAULT_CASCADE,
  IMMUNITY_ORDER,
  type CascadeConfig,
  type ImmuneDecision,
  type ImmuneRequest,
  type ImmunityLevel,
  type PolicyView,
  type RiskScore,
} from './types';

export interface ImmuneGateConfig {
  level?: ImmunityLevel;
  cascade?: CascadeConfig;
  /** celia safe-mode (IMMUNE §24): read-only، بلا شبكة/أسرار/نشر/مكوّنات/كتابة. */
  safeMode?: boolean;
  /** celia emergency-lock (IMMUNE §25): STOP شامل. */
  emergencyLock?: boolean;
  policy?: PolicyView;
}

export function levelForScore(score: number): ImmunityLevel {
  if (score >= 90) return 'BLACK';
  if (score >= 70) return 'RED';
  if (score >= 40) return 'ORANGE';
  if (score > 0) return 'YELLOW';
  return 'GREEN';
}

export function maxLevel(a: ImmunityLevel, b: ImmunityLevel): ImmunityLevel {
  return IMMUNITY_ORDER[a] >= IMMUNITY_ORDER[b] ? a : b;
}

/** أفعال تُمكّن الكتابة/الوصول الخارجي — تُحظر في safe-mode. */
function isWriteOrRisky(capability: string): boolean {
  return (
    capability.startsWith('fs.write') ||
    capability.startsWith('git.push') ||
    capability.startsWith('shell.') ||
    capability.startsWith('secret.') ||
    capability.startsWith('deploy') ||
    capability.startsWith('deployment.') ||
    capability.startsWith('network.') ||
    capability.includes('plugin') ||
    capability.includes('db.') ||
    capability === 'repo.write'
  );
}

function decide(
  allowed: boolean,
  action: ImmuneDecision['action'],
  level: ImmunityLevel,
  risk: RiskScore,
  reasons: string[],
  approvalRequired: boolean,
  evidenceRequired: boolean,
): ImmuneDecision {
  return { allowed, action, level, risk, reasons, approvalRequired, evidenceRequired };
}

/**
 * الـImmune Gate (IMMUNE §29) — نقطة الدخول الإلزامية بين Control Plane والـKernel:
 *
 *   USER → CONTROL PLANE → IMMUNE GATE → ATOMIC KERNEL → IMMUNE RUNTIME → Agents/Tools/Models/Runner/Plugins
 *
 * Detect → Decide (خالص، بلا أثر جانبي) — التطبيق (Isolate/Recover) في ImmuneRuntime.
 */
export class ImmuneGate {
  readonly detector = new Detector();
  readonly risk = new RiskEngine();
  readonly firewall = new PolicyFirewall();

  constructor(private config: ImmuneGateConfig = {}) {}

  get level(): ImmunityLevel {
    if (this.config.emergencyLock) return 'BLACK';
    if (this.config.safeMode) return 'ORANGE';
    return this.config.level ?? 'GREEN';
  }

  get isSafeMode(): boolean {
    return this.config.safeMode === true;
  }

  get isEmergencyLock(): boolean {
    return this.config.emergencyLock === true;
  }

  evaluate(request: ImmuneRequest): ImmuneDecision {
    const cascade = this.config.cascade ?? DEFAULT_CASCADE;
    const risk0 = this.risk.evaluate([]);

    // 0) disaster mode — STOP شامل (IMMUNE §25)
    if (this.config.emergencyLock) {
      return decide(false, 'block', 'BLACK', risk0, ['emergency-lock: all execution stopped'], false, true);
    }

    const observation = {
      ...(request.observation ?? {}),
      principal: request.principal,
      capability: request.capability,
      scope: request.scope,
    };

    // 1) Detect
    const detections = this.detector.detect(observation);
    const risk = this.risk.evaluate(detections);
    const reasons = risk.reasons.map((r) => r.detail);

    // 2) firewall الحتمي (deny-by-default) — golden rule
    const fw = this.firewall.evaluate(detections);
    if (fw) {
      return decide(false, fw.action, levelForScore(risk.score), risk, [fw.reason, ...reasons], false, fw.action !== 'block');
    }

    // 3) dependency anomaly — release gate (IMMUNE §17): شديد → BLOCK RELEASE
    const depDetections = detections.filter((d) => d.kind === 'dependency_anomaly');
    if (depDetections.length > 0) {
      const severe = depDetections.some((d) => /known vulnerability|install script/i.test(d.detail));
      const depReasons = depDetections.map((d) => d.detail);
      if (severe) {
        return decide(false, 'block', 'RED', risk, [`release blocked: ${depReasons.join('; ')}`], false, true);
      }
      return decide(true, 'monitor', 'YELLOW', risk, [`dependency drift: ${depReasons.join('; ')}`], false, true);
    }

    // 4) safe-mode — تقليل الصلاحيات (IMMUNE §24)
    if (this.config.safeMode && isWriteOrRisky(request.capability)) {
      return decide(false, 'restrict', 'ORANGE', risk, ['safe-mode: write/network/secret/deploy/plugin actions blocked'], false, true);
    }

    // 5) مستوى المناعة = أقصى (المستوى المضبوط، مستوى الخطر)
    const level = maxLevel(this.config.level ?? 'GREEN', levelForScore(risk.score));

    // 6) blast radius → approval (IMMUNE §23)
    const approvalRequired = blastRadiusGate.requiresApproval(risk, request.blastRadius, cascade.blastRadiusApprovalThreshold);
    if (approvalRequired) {
      reasons.push('risk × blast radius exceeds threshold — approval required');
    }

    switch (level) {
      case 'GREEN':
        return decide(true, 'allow', level, risk, reasons, false, false);
      case 'YELLOW':
        return decide(true, 'monitor', level, risk, reasons, approvalRequired, true);
      case 'ORANGE':
        return decide(false, 'restrict', level, risk, reasons, approvalRequired, true);
      case 'RED':
        return decide(false, 'quarantine', level, risk, reasons, approvalRequired, true);
      case 'BLACK':
        return decide(false, 'kill', level, risk, reasons, approvalRequired, true);
    }
  }
}
