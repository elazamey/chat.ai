import { StateMachine } from '@aok/transition';
import {
  FULL_QUARANTINE,
  NORMAL_RESTRICTIONS,
  type QuarantineRecord,
  type QuarantineRestrictions,
  type QuarantineState,
} from './types';

/**
 * الـQuarantine (IMMUNE §7) — أهم مكوّن:
 *   ACTIVE → SUSPICIOUS → QUARANTINED → ANALYSIS → RECOVERED / REVOKED
 * داخل الحجر: filesystem=read-only · network=blocked · credentials=revoked
 *              · new processes=blocked · plugin=disabled
 */
export const QUARANTINE_MACHINE = new StateMachine<QuarantineState, string>({
  ACTIVE: { flag: 'SUSPICIOUS' },
  SUSPICIOUS: { quarantine: 'QUARANTINED' },
  QUARANTINED: { analyze: 'ANALYSIS' },
  ANALYSIS: { recover: 'RECOVERED', revoke: 'REVOKED' },
});

export class Quarantine {
  private records = new Map<string, QuarantineRecord>();

  get(entityId: string): QuarantineRecord | undefined {
    const r = this.records.get(entityId);
    return r ? { ...r } : undefined;
  }

  list(): QuarantineRecord[] {
    return [...this.records.values()].map((r) => ({ ...r }));
  }

  get size(): number {
    return this.records.size;
  }

  /** وضع كيان تحت الحجر الكامل. */
  quarantine(entityId: string, reason: string, evidence: string[] = []): QuarantineRecord {
    const existing = this.records.get(entityId);
    if (existing) {
      const next = this.transition(existing, 'quarantine', reason, evidence);
      return next;
    }
    const record: QuarantineRecord = {
      entityId,
      state: 'QUARANTINED',
      reason,
      restrictions: FULL_QUARANTINE,
      enteredAt: new Date().toISOString(),
      evidence: [...evidence],
    };
    this.records.set(entityId, record);
    return { ...record };
  }

  /** علم/شك مبدئي دون حجر كامل. */
  flag(entityId: string, reason: string): QuarantineRecord {
    const existing = this.records.get(entityId);
    if (existing) return this.transition(existing, 'flag', reason, []);
    const record: QuarantineRecord = {
      entityId,
      state: 'SUSPICIOUS',
      reason,
      restrictions: NORMAL_RESTRICTIONS,
      enteredAt: new Date().toISOString(),
      evidence: [],
    };
    this.records.set(entityId, record);
    return { ...record };
  }

  analyze(entityId: string): QuarantineRecord {
    return this.must(entityId, 'analyze');
  }

  recover(entityId: string, note?: string): QuarantineRecord {
    const r = this.must(entityId, 'recover');
    if (note) r.reason = `${r.reason} — recovered: ${note}`;
    this.records.set(entityId, { ...r, restrictions: NORMAL_RESTRICTIONS });
    return { ...r };
  }

  revoke(entityId: string, reason: string): QuarantineRecord {
    const r = this.must(entityId, 'revoke');
    r.reason = reason;
    this.records.set(entityId, r);
    return { ...r };
  }

  isQuarantined(entityId: string): boolean {
    const r = this.records.get(entityId);
    return r?.state === 'QUARANTINED' || r?.state === 'ANALYSIS';
  }

  restrictionsOf(entityId: string): QuarantineRestrictions {
    return this.records.get(entityId)?.restrictions ?? NORMAL_RESTRICTIONS;
  }

  private must(entityId: string, event: string): QuarantineRecord {
    const existing = this.records.get(entityId);
    if (!existing) throw new Error(`quarantine: unknown entity '${entityId}'`);
    return this.transition(existing, event, existing.reason, existing.evidence);
  }

  private transition(
    current: QuarantineRecord,
    event: string,
    reason: string,
    evidence: string[],
  ): QuarantineRecord {
    const next = QUARANTINE_MACHINE.transition(current.state, event);
    const record: QuarantineRecord = {
      ...current,
      state: next,
      reason,
      evidence: [...evidence],
      restrictions: next === 'RECOVERED' ? NORMAL_RESTRICTIONS : current.restrictions,
    };
    this.records.set(current.entityId, record);
    return { ...record };
  }
}
