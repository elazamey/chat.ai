/**
 * Failure Injection + Chaos (العضو #30):
 * حقن فشل حتمي وقابل للجدولة — "ماذا يحدث إذا اختفى الـRunner في منتصف commit؟"
 * أو "ماذا لو أعاد الـModel نتيجة خبيثة؟" — بدون أي تكلفة.
 */

export type FaultSchedule = 'always' | 'never' | number[];

export interface FailurePlan {
  [faultName: string]: FaultSchedule;
}

export class FailureInjector {
  private counts = new Map<string, number>();

  constructor(private plan: FailurePlan = {}) {}

  /** هل يجب أن يفشل هذا الاستدعاء (رقم المحاولة المطابق للجدولة)؟ */
  shouldFail(name: string): boolean {
    const attempt = this.attempts(name) + 1;
    this.counts.set(name, attempt);
    const s = this.plan[name];
    if (s === undefined || s === 'never') return false;
    if (s === 'always') return true;
    return s.includes(attempt);
  }

  attempts(name: string): number {
    return this.counts.get(name) ?? 0;
  }

  set(name: string, schedule: FaultSchedule): void {
    this.plan[name] = schedule;
  }
}

/**
 * Chaos Runner — يشغّل دالة تحت حقن فشل:
 * إذا فشل الفشل المحقون في المحاولة المحددة، يرمي error فوريًا (لا تنفيذ).
 */
export class ChaosRunner {
  constructor(private injector: FailureInjector) {}

  async run<T>(fault: string, fn: () => Promise<T>, makeError: () => Error = () => new Error(`injected failure '${fault}'`)): Promise<T> {
    if (this.injector.shouldFail(fault)) throw makeError();
    return fn();
  }

  /** هل الفشل مفعّل في هذه المحاولة القادمة؟ (للتأكيد قبل التنفيذ). */
  willFail(fault: string): boolean {
    return this.injector.shouldFail(fault);
  }
}

/** فشل قابل للحقن في أي نقطة — نماذج جاهزة. */
export function injectedError(fault: string): Error {
  return new Error(`[chaos] injected failure: ${fault}`);
}
