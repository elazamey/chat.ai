/**
 * Deterministic Clock — للـHarness (العضو #30):
 * زمن قابل للتحكم (خطوة بخطوة) بدل Date.now() غير الحتمي.
 */
export class DeterministicClock {
  private t: number;

  constructor(start = 1_700_000_000_000, private stepMs = 1) {
    this.t = start;
  }

  now(): number {
    const v = this.t;
    this.t += this.stepMs;
    return v;
  }

  set(ms: number): void {
    this.t = ms;
  }

  advance(ms: number): void {
    this.t += ms;
  }

  iso(): string {
    return new Date(this.now()).toISOString();
  }

  /** زمن ثابت لا يتقدم (لاختبارات لا تهتم بالتقدم). */
  static fixed(start = 1_700_000_000_000): () => number {
    return () => start;
  }
}
