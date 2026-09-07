import type { RetryPolicy } from './types';

/**
 * M4.4 — Retry Policy ليست "كرر ثلاث مرات":
 * - maxAttempts + backoff (fixed | exponential) + retryableErrors + jitter.
 * - الخطأ غير القابل للإعادة (denied/QuotaExceeded/approval) لا يُعاد.
 * - التكامل مع Immune: repeated failure → risk → circuit breaker → stop
 *   يتم عبر `FailureGuard` المحقون في الـDagExecutor (وليس هنا).
 */

export function isRetryable(policy: RetryPolicy, error: string): boolean {
  if (policy.retryableErrors.includes('*')) return true;
  return policy.retryableErrors.some((r) => error.includes(r) || error === r);
}

/** delay قبل المحاولة التالية (بالمللي ثانية). attempt تبدأ من 1 (المحاولة الفاشلة). */
export function backoffMs(policy: RetryPolicy, attempt: number, rng: () => number = Math.random): number {
  const base = 1000;
  let delay = policy.backoff === 'exponential' ? base * 2 ** (attempt - 1) : base;
  if (policy.jitter) {
    // jitter في [0.5, 1.0] من القيمة — يمنع تزامن retries (thundering herd).
    delay = Math.round(delay * (0.5 + rng() * 0.5));
  }
  return delay;
}
