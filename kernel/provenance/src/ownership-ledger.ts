import { Ledger } from '@aok/events';
import { systemActor, OWNERSHIP_EVENT_TYPES, type OwnershipEventType } from '@aok/contracts';

/**
 * Ownership Ledger — الملكية كـevent history (نفس Ledger append-only).
 * كل حدث ملكية مربوط بسابقه بسلسلة تجزئة (قابل للتدقيق وإعادة التشغيل).
 */
export class OwnershipLedger {
  private ledger = new Ledger();

  append(type: OwnershipEventType, payload: unknown, opts: { runId?: string; taskId?: string } = {}): ReturnType<Ledger['append']> {
    return this.ledger.append({
      actor: systemActor,
      type,
      taskId: opts.taskId ?? 'ownership',
      runId: opts.runId ?? 'ownership',
      payload,
    });
  }

  events() {
    return this.ledger.all;
  }

  verifyIntegrity() {
    return this.ledger.verifyIntegrity();
  }
}

export { OWNERSHIP_EVENT_TYPES };
