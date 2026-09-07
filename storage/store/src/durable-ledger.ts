import { Ledger, verifyChain } from '@aok/events';
import type { LedgerEvent, LedgerEventDraft } from '@aok/contracts';
import type { EventStore } from './contracts';

/**
 * DurableLedger — نفس Ledger النواة لكنه يثبّت الأحداث في EventStore دائم:
 * - append() يبقى sync (لا يغيّر عقد النواة)، والأحداث تتراكم في pending.
 * - flush() يثبّت الدفعة ذرّيًا في الـstore.
 * - hydrate() يعيد البناء من الـstore ويتحقق أن سلسلة التجزئة سليمة (tamper-evident).
 *
 * الإقلاع بعد crash:
 *   const ledger = new DurableLedger(store); await ledger.hydrate();
 *   // الحالة الآن مطابقة لما قبل الانقطاع، والـhash chain مُتحقق منه.
 */
export class DurableLedger extends Ledger {
  private pending: LedgerEvent[] = [];

  constructor(private store: EventStore) {
    super();
  }

  /** يعيد بناء السلسلة من الأحداث المخزنة ويتحقق من سلامتها. */
  async hydrate(): Promise<void> {
    const events = await this.store.all();
    if (events.length === 0) return;

    const check = verifyChain(events);
    if (!check.valid) {
      throw new Error(`durable ledger: stored chain is invalid at seq ${check.index}`);
    }

    for (const e of events) {
      const rebuilt = super.append({
        actor: e.actor,
        type: e.type,
        taskId: e.taskId,
        runId: e.runId,
        payload: e.payload,
        evidence: e.evidence,
      });
      if (rebuilt.hash !== e.hash) {
        throw new Error(`durable ledger: hash mismatch at seq ${e.seq} (tamper detected)`);
      }
    }
  }

  override append<T>(draft: LedgerEventDraft<T>): LedgerEvent<T> {
    const ev = super.append(draft);
    this.pending.push(ev as LedgerEvent);
    return ev;
  }

  /** يثبّت الأحداث المعلقة في الـstore (ذرّيًا). */
  async flush(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    await this.store.append(batch);
  }

  get pendingCount(): number {
    return this.pending.length;
  }
}
