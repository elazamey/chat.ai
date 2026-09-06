import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { LedgerEvent, LedgerEventDraft } from '@aok/contracts';
import { canonicalize } from './canonicalize';

/** hash(payload + prevHash) — C6. */
export function eventHash(payload: unknown, prevHash: string | null): string {
  return createHash('sha256')
    .update(canonicalize(payload))
    .update('\u0000')
    .update(prevHash ?? '')
    .digest('hex');
}

export interface ChainVerification {
  valid: boolean;
  index?: number; // أول حدث فاسد (إن وجد)
  expected?: string;
  actual?: string;
}

/**
 * يتحقق من سلامة سلسلة الأحداث: يعيد حساب الـhash لكل حدث
 * ويتأكد من أن prevHash يطابق hash الحدث السابق.
 */
export function verifyChain(events: LedgerEvent[]): ChainVerification {
  let prev: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const expected = eventHash(ev.payload, prev);
    if (ev.hash !== expected) {
      return { valid: false, index: i, expected, actual: ev.hash };
    }
    if (ev.prevHash !== prev) {
      return {
        valid: false,
        index: i,
        expected: prev ?? '(null)',
        actual: ev.prevHash ?? '(null)',
      };
    }
    prev = ev.hash;
  }
  return { valid: true };
}

/** جذر Merkle فوق تواقيع الأحداث (الاتجاه المستقبلي — C6). */
export function merkleRoot(events: LedgerEvent[]): string {
  if (events.length === 0) return '';
  let level = events.map((e) => e.hash);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!;
      const right = level[i + 1] ?? left; // تكرار العقدة الفردية
      next.push(createHash('sha256').update(left).update(right).digest('hex'));
    }
    level = next;
  }
  return level[0]!;
}

/**
 * الـLedger append-only (C6): لا update ولا delete، فقط append.
 * هو مصدر الحقيقة للنظام، وكل حدث مربوط بسابقه بسلسلة تجزئة.
 */
export class Ledger {
  private events: LedgerEvent[] = [];

  append<T>(draft: LedgerEventDraft<T>): LedgerEvent<T> {
    const seq = this.events.length;
    const prev = this.events[seq - 1];
    const prevHash = prev ? prev.hash : null;
    const event: LedgerEvent<T> = {
      id: randomUUID(),
      seq,
      timestamp: new Date().toISOString(),
      ...draft,
      prevHash,
      hash: eventHash(draft.payload, prevHash),
    };
    this.events.push(event as LedgerEvent);
    return event;
  }

  get all(): LedgerEvent[] {
    return this.events.map((e) => ({ ...e }));
  }

  at(seq: number): LedgerEvent | undefined {
    const e = this.events[seq];
    return e ? { ...e } : undefined;
  }

  get length(): number {
    return this.events.length;
  }

  /** إعادة التشغيل بترتيب الإدراج (Replay). */
  replay(): LedgerEvent[] {
    return this.all;
  }

  verifyIntegrity(): ChainVerification {
    return verifyChain(this.events);
  }

  merkleRoot(): string {
    return merkleRoot(this.events);
  }
}
