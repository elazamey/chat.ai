import type { Ledger } from '@aok/events';
import { CircuitBreakers } from './circuit-breaker';
import { ImmuneGate, maxLevel } from './gate';
import { HealthModel, MetricsCollector } from './health';
import { IncidentEngine } from './incident';
import { IntegrityGuardian } from './integrity';
import { KillSwitch } from './kill-switch';
import { Quarantine } from './quarantine';
import { RecoveryEngine } from './recovery';
import {
  DEFAULT_CASCADE,
  type CascadeConfig,
  type ImmuneDecision,
  type ImmuneRequest,
  type ImmunityLevel,
  type KillOutcome,
  type KillTargetType,
  type PolicyView,
  type SystemHealth,
} from './types';

export interface ImmuneRuntimeOptions {
  ledger?: Ledger;
  level?: ImmunityLevel;
  cascade?: CascadeConfig;
  safeMode?: boolean;
  emergencyLock?: boolean;
  policy?: PolicyView;
}

function killTargetFor(principalType: string): KillTargetType {
  switch (principalType) {
    case 'agent':
      return 'agent';
    case 'plugin':
    case 'tool':
      return 'plugin';
    case 'runner':
      return 'runner';
    default:
      return 'run';
  }
}

/**
 * الـImmune Runtime (IMMUNE §29) — يطبّق القرارات (Isolate → Recover → Verify):
 *   Gate = Detect → Decide (خالص) · Runtime = التطبيق + الدليل + التعافي.
 * حتى لو تعطّل جهاز المناعة، لا ينهار النظام إلى حالة غير آمنة:
 * القرار الافتراضي deny (فشل مغلق للعمليات الحساسة).
 */
export class ImmuneRuntime {
  readonly gate: ImmuneGate;
  readonly quarantine = new Quarantine();
  readonly recovery = new RecoveryEngine();
  readonly integrity = new IntegrityGuardian();
  readonly incidents: IncidentEngine;
  readonly breakers = new CircuitBreakers();
  readonly killSwitch: KillSwitch;
  readonly health = new HealthModel();
  readonly metrics = new MetricsCollector();

  private currentLevel: ImmunityLevel;

  constructor(private opts: ImmuneRuntimeOptions = {}) {
    this.currentLevel = opts.level ?? 'GREEN';
    this.gate = new ImmuneGate({
      level: opts.level,
      cascade: opts.cascade ?? DEFAULT_CASCADE,
      safeMode: opts.safeMode,
      emergencyLock: opts.emergencyLock,
      policy: opts.policy,
    });
    this.incidents = new IncidentEngine(opts.ledger);
    this.killSwitch = new KillSwitch(opts.policy);
  }

  get level(): ImmunityLevel {
    return maxLevel(this.currentLevel, this.gate.level);
  }

  get isSafeMode(): boolean {
    return this.gate.isSafeMode;
  }

  get isEmergencyLock(): boolean {
    return this.gate.isEmergencyLock;
  }

  evaluate(request: ImmuneRequest): ImmuneDecision {
    return this.gate.evaluate(request);
  }

  /** Detect → Decide → Isolate: تقييم + تطبيق (حجر/إيقاف/حادثة/دليل). */
  evaluateAndApply(request: ImmuneRequest): ImmuneDecision {
    const decision = this.gate.evaluate(request);
    this.apply(decision, request);
    return decision;
  }

  /** kill مستقل (IMMUNE §6): immune.kill(run|agent|plugin|runner). */
  kill(targetType: KillTargetType, targetId: string, reason: string): KillOutcome {
    const outcome = this.killSwitch.request({ targetType, targetId, reason, requester: 'immune' });
    if (outcome.applied) {
      this.quarantine.quarantine(targetId, reason);
      this.metrics.recordQuarantine();
      this.metrics.recordKill();
    }
    return outcome;
  }

  /** الـAgent *يطلب* kill — القرار يمر عبر Policy (لا `agent.kill(anything)`). */
  requestKill(requester: string, targetType: KillTargetType, targetId: string, reason: string): KillOutcome {
    const outcome = this.killSwitch.request({ targetType, targetId, reason, requester });
    if (outcome.applied) {
      this.quarantine.quarantine(targetId, reason);
      this.metrics.recordQuarantine();
      this.metrics.recordKill();
    }
    return outcome;
  }

  isKilled(type: KillTargetType, id: string): boolean {
    return this.killSwitch.isKilled(type, id);
  }

  /** Health Model (IMMUNE §27). */
  healthSnapshot(runners: { healthy: number; quarantined: number } = { healthy: 0, quarantined: 0 }): SystemHealth {
    const ledgerHealthy = this.opts.ledger ? this.opts.ledger.verifyIntegrity().valid : true;
    const kernelHealthy = this.integrity.breaches(
      this.integrity.checkAll(Object.fromEntries(this.integrity.registered().map((e) => [e.target, e.expectedHash]))),
    ).length === 0;
    return this.health.snapshot({
      level: this.level,
      ledgerHealthy,
      storageHealthy: true,
      kernelHealthy,
      runners,
      incidents: this.incidents.count,
    });
  }

  private apply(decision: ImmuneDecision, request: ImmuneRequest): void {
    const id = request.principal.id;
    const detail = decision.reasons.join('; ') || decision.action;

    if (decision.action === 'allow' || decision.action === 'monitor' || decision.action === 'approval_required') {
      return;
    }

    if (decision.action === 'restrict') {
      this.metrics.recordPolicyViolation();
      return;
    }

    // quarantine / kill / block(severe) — عزل + حادثة + دليل
    if (decision.action === 'quarantine' || decision.action === 'kill' || decision.level === 'RED' || decision.level === 'BLACK') {
      this.quarantine.quarantine(id, detail, decision.risk.reasons.map((r) => r.detail));
      this.metrics.recordQuarantine();

      if (decision.action === 'kill') {
        this.killSwitch.request({ targetType: killTargetFor(request.principal.type), targetId: id, reason: detail, requester: 'immune' });
        this.metrics.recordKill();
      }

      this.openIncident(decision, id, detail);
    }
  }

  private openIncident(decision: ImmuneDecision, entityId: string, detail: string): void {
    this.metrics.incidentOpened();
    const incident = this.incidents.detect(
      `immune ${decision.action} on '${entityId}'`,
      decision.risk.severity,
      decision.risk.reasons.map((r) => r.detail),
    );
    this.metrics.detected();
    this.incidents.classify(incident.id, decision.risk.severity);
    this.incidents.contain(incident.id, detail);
    this.metrics.contained();
    // رفع مستوى المناعة إلى مستوى القرار على الأقل
    this.currentLevel = maxLevel(this.currentLevel, decision.level);
  }
}
