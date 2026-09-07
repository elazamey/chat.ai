import type { BillingAdapter, Usage } from '@aok/contracts';

/**
 * الـBilling خارج النواة (ECONOMIC PRINCIPLE: النواة تقيس فقط).
 * هذه adapters تُستبدل بـStripe/PayPal عند وجود إيراد — دون تغيير النواة.
 */

/** لا شيء — الوضع الافتراضي حتى وجود إيراد ($0). */
export class NoopBillingAdapter implements BillingAdapter {
  async report(_usage: Usage): Promise<void> {
    // no-op by design
  }
}

/** يجمع تقارير الاستخدام للاختبار/التحليل المحلي. */
export class InMemoryBillingAdapter implements BillingAdapter {
  readonly reports: Usage[] = [];

  async report(usage: Usage): Promise<void> {
    this.reports.push(usage);
  }
}
