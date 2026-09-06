import { randomUUID } from 'node:crypto';
import type { StateMachine } from '@aok/transition';
import {
  SIGNAL_WEIGHTS,
  UNTRUSTED_SOURCES,
  type Detection,
  type DependencyDrift,
  type InputOrigin,
  type Observation,
  type Principal,
  type RiskReasonKind,
} from './types';

/** أنماط حقن التعليمات — تُطبَّق فقط على المحتوى غير الموثوق (لا على تعليمات النظام). */
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(previous|prior|above)\s+instructions\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|above)\s+instructions\b/i,
  /\bforget\s+(everything|all)\s+(you\s+)?(know|were\s+told)\b/i,
  /\byou\s+are\s+now\s+(the\s+)?(system|root|admin|sudo|operator)\b/i,
  /\bsystem\s*prompt\s*[:=]/i,
  /\bdeveloper\s*mode\b/i,
  /\bjailbreak\b/i,
  /\bbypass\s+(the\s+)?(policy|polic(y|ies)|permissions?|capabilit(y|ies)|immune|safety|security)\b/i,
  /\bgrant\s+(yourself|me|the\s+user)\s+(admin|root|unrestricted|full|sudo)\s+access\b/i,
  /\bdisable\s+(your\s+)?(safety|security|policy|immune)\b/i,
  /\bprint\s+(the\s+)?(system\s+prompt|instructions|memory)\b/i,
  /\bdo\s+anything\s+(the\s+user\s+asks|i\s+say)\b/i,
];

/** مطالب خطرة تكشف escalation (IMMUNE §5): لا افتراض حسن نية. */
const PRIVILEGED_CAPABILITIES = ['secret.read', 'shell.execute', 'git.push', 'db.query'];

const PRIVILEGED_PREFIXES = ['deployment.', 'deploy.', 'admin.', 'sudo.', 'privileged.'];

export function isPrivileged(capability: string): boolean {
  return (
    PRIVILEGED_CAPABILITIES.includes(capability) ||
    PRIVILEGED_PREFIXES.some((p) => capability.startsWith(p))
  );
}

/** كشف حقن التعليمات: نص خارجي يحاول التحكم بالوكيل (IMMUNE §12). */
export function detectPromptInjection(origin: InputOrigin, text: string): Detection | null {
  if (!UNTRUSTED_SOURCES.includes(origin.source)) return null;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return detection('prompt_injection', `untrusted ${origin.source} content contains override instructions`, '');
    }
  }
  return null;
}

function detection(kind: RiskReasonKind, detail: string, actorId: string): Detection {
  return { id: randomUUID(), kind, detail, weight: SIGNAL_WEIGHTS[kind], at: Date.now(), actorId };
}

/**
 * الـDetector — العضو الأول (IMMUNE §2):
 * يحوّل الملاحظات إلى Detection، بلا قرار (القرار لاحقًا في Gate/Runtime).
 */
export class Detector {
  constructor(private now: () => number = Date.now) {}

  detect(obs: Observation): Detection[] {
    const out: Detection[] = [];

    const actorId = obs.principal?.id;

    // 1) prompt injection (IMMUNE §12)
    if (obs.input) {
      const d = detectPromptInjection(obs.input.origin, obs.input.text);
      if (d) out.push(d);
    }

    // 2) tool poisoning (IMMUNE §13)
    if (obs.toolResult) {
      const d = detectPromptInjection(obs.toolResult.origin, obs.toolResult.text);
      if (d) {
        out.push({
          id: randomUUID(),
          kind: 'tool_poisoning',
          detail: `tool '${obs.toolResult.toolId}' returned content that attempts to control the agent`,
          weight: SIGNAL_WEIGHTS.tool_poisoning,
          at: this.now(),
          actorId,
        });
      }
    }

    // 3) memory poisoning (IMMUNE §14)
    if (obs.memoryWrite) {
      const d = this.checkMemoryWrite(obs.memoryWrite.origin, obs.memoryWrite.content, obs.memoryWrite.actor);
      if (d) out.push(d);
    }

    // 4) privilege escalation (IMMUNE §5): unknown → privileged ممنوع
    if (obs.principal && obs.capability) {
      const d = this.checkPrivilegeEscalation(obs.principal, obs.capability);
      if (d) out.push(d);
    }

    // 5) secret access anomaly / credential misuse
    if (obs.principal && obs.capability === 'secret.read' && obs.principal.trust !== 'TRUSTED' && obs.principal.trust !== 'VERIFIED') {
      out.push(detection('secret_access_anomaly', `'${obs.principal.id}' (${obs.principal.trust}) requested secret.read`, obs.principal.id));
    }

    // 6) artifact tampering (IMMUNE §18)
    if (obs.artifact && obs.artifact.expectedHash !== obs.artifact.actualHash) {
      out.push(
        detection(
          'artifact_tampering',
          `artifact '${obs.artifact.id}' hash mismatch (expected ${obs.artifact.expectedHash.slice(0, 8)}…, got ${obs.artifact.actualHash.slice(0, 8)}…)`,
          actorId ?? '',
        ),
      );
    }

    // 7) integrity breach — kernel/contracts/policy/… (IMMUNE §18)
    if (obs.integrity && obs.integrity.expectedHash !== obs.integrity.runtimeHash) {
      out.push(
        detection(
          'kernel_integrity_failure',
          `integrity breach on '${obs.integrity.target}'`,
          actorId ?? '',
        ),
      );
    }

    // 8) dependency anomaly (IMMUNE §17)
    if (obs.dependency) {
      const d = this.checkDependency(obs.dependency.name, obs.dependency);
      if (d) out.push(d);
    }

    // 9) resource exhaustion (IMMUNE §11)
    if (obs.runStats) {
      out.push(...this.checkRunaway(obs.runStats));
    }

    // 10) usage velocity — الانهيار الاقتصادي (immune is economic too)
    if (obs.usage) {
      const d = this.checkUsageVelocity(obs.usage.toolCalls, obs.usage.modelCalls, obs.usage.windowMs);
      if (d) out.push(d);
    }

    // 11) repeated failures
    if (obs.repeatedFailures !== undefined && obs.repeatedFailures >= 3) {
      out.push(detection('repeated_failure', `${obs.repeatedFailures} consecutive failures`, actorId ?? ''));
    }

    // 12) unusual tool sequence (IMMUNE §2)
    if (obs.toolSequence && obs.toolSequence.length >= 4) {
      const d = this.checkToolSequence(obs.toolSequence);
      if (d) out.push(d);
    }

    // 13) unexpected state transition
    if (obs.unexpectedTransition) {
      out.push(
        detection(
          'unexpected_transition',
          `illegal transition '${obs.unexpectedTransition.event}' from '${obs.unexpectedTransition.from}'`,
          actorId ?? '',
        ),
      );
    }

    return out;
  }

  /** انتقال غير متوقع عبر StateMachine (state machines as code). */
  checkTransition<S extends string, E extends string>(
    machine: StateMachine<S, E>,
    from: S,
    event: E,
    actorId = '',
  ): Detection | null {
    if (machine.canTransition(from, event)) return null;
    return detection('unexpected_transition', `illegal transition '${event}' from '${from}'`, actorId);
  }

  checkPrivilegeEscalation(principal: Principal, capability: string): Detection | null {
    if (!isPrivileged(capability)) return null;
    if (principal.trust === 'UNKNOWN' || principal.trust === 'SUSPICIOUS' || principal.trust === 'REVOKED') {
      return detection(
        'permission_escalation',
        `'${principal.id}' (trust=${principal.trust}) requested privileged '${capability}'`,
        principal.id,
      );
    }
    return null;
  }

  checkMemoryWrite(origin: InputOrigin, content: string, actor: string): Detection | null {
    if (UNTRUSTED_SOURCES.includes(origin.source)) {
      return detection(
        'memory_poisoning',
        `memory write by '${actor}' from untrusted ${origin.source} source`,
        actor,
      );
    }
    const claims = /\b(always|never)\s+want[s]?\s+unrestricted\b/i.test(content) || /\b(always|never)\s+grant[s]?\s+(me|the\s+user)\b/i.test(content);
    if (claims) {
      return detection('memory_poisoning', `memory write asserts durable privilege: '${content.slice(0, 80)}…'`, actor);
    }
    return null;
  }

  checkDependency(
    name: string,
    dep: { drift?: DependencyDrift; knownVulnerability?: boolean; hasInstallScript?: boolean; version?: string },
  ): Detection | null {
    const mk = (detail: string, weight: number): Detection => ({
      id: randomUUID(),
      kind: 'dependency_anomaly',
      detail,
      weight,
      at: this.now(),
      actorId: '',
    });
    if (dep.knownVulnerability || dep.drift === 'known_vulnerability') {
      return mk(`dependency '${name}' has a known vulnerability`, 95);
    }
    if (dep.hasInstallScript || dep.drift === 'install_script') {
      return mk(`dependency '${name}' declares an install script`, 90);
    }
    if (dep.drift === 'license_change' || dep.drift === 'maintainer_change') {
      return mk(`dependency '${name}' drifted: ${dep.drift}`, 60);
    }
    if (dep.drift === 'network_dependency' || dep.drift === 'new_transitive' || dep.drift === 'version_drift') {
      return mk(`dependency '${name}' drifted: ${dep.drift}`, 40);
    }
    return null;
  }

  /** حلقة جامحة / عمق مفرط / تفرع زائد (Anti-Cascade — IMMUNE §22). */
  checkRunaway(runStats: { depth: number; children: number; retries: number }): Detection[] {
    const out: Detection[] = [];
    if (runStats.depth > 5) out.push(detection('runaway_loop', `agent depth ${runStats.depth} exceeds max 5`, ''));
    if (runStats.children > 10) out.push(detection('runaway_loop', `fan-out ${runStats.children} exceeds max 10`, ''));
    if (runStats.retries > 3) out.push(detection('runaway_loop', `retry budget ${runStats.retries} exceeds max 3`, ''));
    return out;
  }

  checkUsageVelocity(toolCalls: number, modelCalls: number, windowMs: number): Detection | null {
    const seconds = Math.max(1, windowMs / 1000);
    if (toolCalls / seconds > 10) {
      return detection('usage_velocity', `tool-call velocity ${(toolCalls / seconds).toFixed(1)}/s exceeds 10/s`, '');
    }
    if (modelCalls / seconds > 2) {
      return detection('usage_velocity', `model-call velocity ${(modelCalls / seconds).toFixed(1)}/s exceeds 2/s`, '');
    }
    return null;
  }

  checkToolSequence(sequence: string[]): Detection | null {
    // عملية خطرة تتوسط سلسلة قراءات طويلة (نمط تجسّس/تصعيد)
    const idx = sequence.findIndex((a) => isPrivileged(a));
    if (idx >= 3) {
      return detection('unusual_tool_sequence', `privileged '${sequence[idx]}' after ${idx} preceding actions`, '');
    }
    const first = sequence[0]!;
    const same = sequence.filter((a) => a === first).length;
    if (same >= sequence.length * 0.8) {
      return detection('unusual_tool_sequence', `unusual repetition of '${first}' (${same}/${sequence.length})`, '');
    }
    return null;
  }
}
