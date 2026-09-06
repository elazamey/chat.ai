# ADR-0022 — Zero-Cost Economic Contract

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
الاعتماد على خدمة مدفوعة كي تعمل النواة يجعل الوصول لأول إيراد يتطلب تمويلًا مسبقًا.

## القرار
- **Zero-Cost-to-Build + Zero-Cost-to-Deploy + Monetizable-by-Design** (وثيقة `ZERO_COST_ECONOMIC_CONTRACT.md`).
- النواة تعمل محليًا بالكامل: Core/Policy/Ledger/Verification/Runtime/Tools كلها local، والتخزين والنماذج pluggable.
- **Open Core**: النواة + CLI + Runner مجانية؛ تُباع الراحة/النطاق/الحوكمة/البنية المدارة.
- **Profit Boundary**: Free Zone (Core/CLI/Runner/OSS/Local) مقابل Value Zone (Cloud/Premium/Marketplace/Enterprise/Support).

## النتائج
- إيجابي: مسار `$0 → OSS → Users → Free Cloud → Local Runner → {SaaS|Marketplace|Enterprise} → $$$`.
- قيد: إنتاج واسع النطاق لا يبقى مجانيًا للأبد — كل زيادة تكلفة مرتبطة بزيادة إيراد (القيد الواقعي).
