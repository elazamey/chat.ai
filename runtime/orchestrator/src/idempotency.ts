import type { NodeResult } from './types';

/**
 * M4.5 — Idempotency (ضرورية قبل Parallel + Retry).
 *
 * يمنع:  GitHub PR created → network timeout → retry → second PR
 * عبر:   same operationId/idempotencyKey → detect previous execution → reuse result.
 *
 * `run(key, fn)` يضمن تنفيذًا واحدًا لكل key:
 * - delivery مكرر (نفس key) ينتظر/يعيد نفس النتيجة دون أثر جانبي إضافي.
 * - بعد crash: تُزرع النتائج المكتملة من أحداث الـLedger عبر `seedCompleted`.
 */
export interface IdempotencyStore {
  has(key: string): boolean;
  get(key: string): NodeResult | undefined;
  run(key: string, fn: () => Promise<NodeResult>): Promise<NodeResult>;
  seedCompleted(key: string, result: NodeResult): void;
  entries(): [string, NodeResult][];
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private completed = new Map<string, NodeResult>();
  private inFlight = new Map<string, Promise<NodeResult>>();

  has(key: string): boolean {
    return this.completed.has(key);
  }

  get(key: string): NodeResult | undefined {
    return this.completed.get(key);
  }

  async run(key: string, fn: () => Promise<NodeResult>): Promise<NodeResult> {
    const done = this.completed.get(key);
    if (done) return done;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = fn().then((result) => {
      this.completed.set(key, result);
      this.inFlight.delete(key);
      return result;
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  seedCompleted(key: string, result: NodeResult): void {
    this.completed.set(key, result);
  }

  entries(): [string, NodeResult][] {
    return [...this.completed.entries()];
  }
}
