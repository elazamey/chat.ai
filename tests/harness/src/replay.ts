import { Ledger } from '@aok/events';
import type { LedgerEvent } from '@aok/contracts';

/**
 * Replay Runner (العضو #30) — إعادة بناء الحالة من الأحداث (System Resurrection):
 * الـLedger هو مصدر الحقيقة؛ إعادة اللعب بنفس تسلسل الـpayload تنتج
 * **نفس سلسلة التجزئة** (hash = sha256(payload + prevHash) حتمية).
 */
export function replayInto(events: LedgerEvent[]): { ledger: Ledger; replayed: LedgerEvent[] } {
  const ledger = new Ledger();
  const replayed = events.map((e) =>
    ledger.append({
      actor: e.actor,
      type: e.type,
      taskId: e.taskId,
      runId: e.runId,
      payload: e.payload,
      evidence: e.evidence,
    }),
  );
  return { ledger, replayed };
}

export function hashesOf(events: LedgerEvent[]): string[] {
  return events.map((e) => e.hash);
}

/** هل سلسلة التجزئة المعاد بناؤها مطابقة للأصل (tamper-evident resurrection)؟ */
export function replayMatches(original: LedgerEvent[], replayed: LedgerEvent[]): boolean {
  if (original.length !== replayed.length) return false;
  return original.every((e, i) => e.hash === replayed[i]!.hash);
}

/** إسقاط حالة الـRun من أحداث الـRunner الفعلية (state = replay(events)). */
export interface RunProjection {
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  completedSteps: number;
  immuneBlocks: number;
}

export const initialRunProjection: RunProjection = { status: 'ACTIVE', completedSteps: 0, immuneBlocks: 0 };

export function projectRun(events: LedgerEvent[]): RunProjection {
  const p: RunProjection = { ...initialRunProjection };
  for (const e of events) {
    switch (e.type) {
      case 'RunCreated':
        p.status = 'ACTIVE';
        break;
      case 'execution.completed':
        p.completedSteps += 1;
        break;
      case 'ImmuneBlocked':
        p.immuneBlocks += 1;
        break;
      case 'TaskCompleted':
        p.status = 'COMPLETED';
        break;
      case 'TaskFailed':
        p.status = p.immuneBlocks > 0 ? 'BLOCKED' : 'FAILED';
        break;
      default:
        break;
    }
  }
  return p;
}
