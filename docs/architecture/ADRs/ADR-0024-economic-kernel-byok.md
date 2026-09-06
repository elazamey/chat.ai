# ADR-0024 — Economic Kernel (Metering/Quota in-kernel, Billing external) + BYOK + Mock providers

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
فوترة داخل النواة تربطها بـStripe؛ ومقاس بلا ميزانية يهدد هامش الربح.

## القرار
- **النواة تقيس وتطبّق الحدود فقط**: `UsageMeter` + `QuotaPolicy` + `BudgetPolicy` في `kernel/economics`.
- **Billing خارج النواة**: `BillingAdapter` في `adapters/billing` (Noop افتراضيًا؛ Stripe/PayPal عند وجود إيراد).
- **Cost Guard**: كل مورد مُقاس له ميزانية صريحة (ECONOMIC PRINCIPLE 005).
- **BYOK**: `ProviderCredentials = { kind:'byok', secretRef } | managed | none` — لا مفتاح خام أبدًا (RULE 007).
- **MockProvider** حتمي بـ$0 للـCI/التطوير (لا نحرق API quota).
- `Capability = string` و`LedgerEvent.type = string` — ontology-neutral (الكتالوجات مرجعية لا قيود).

## النتائج
- إيجابي: 10,000 اختبار بـ$0 عبر MockProvider؛ وCost-aware routing يستخدم نموذجًا غاليًا فقط عند التبرير.
- قيد: أي مورد جديد يُقاس يجب إضافته لـ`UsageResource` + حقل ميزانيته.
