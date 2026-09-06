# ADR-0014 — CLI أولوية + Vertical Slice MVP

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
بناء Dashboard جميلة قبل الـKernel/الـSecurity/الـVerification هو أكبر خطأ ممكن. و"M0 هيكلة مجلدات" لا يُثبت شيئًا.

## القرار
- **الـCLI واجهة من الدرجة الأولى** (`celia`): `task create/run/inspect`, `run replay`, `ledger show`, `approval approve`, `tools list`, `models list`, `verify`, `evidence export`.
- نبني **Vertical Slice end-to-end** أولًا:
  `User → Create Task → Planner → Approval → GitHub Tool → Sandbox → Ledger → Verification → Evidence → Completed`.

## السيناريو المستهدف
> "خذ repository، حلّ مشكلة محددة، أنشئ commit، افتح PR، ثم أثبت بالأدلة أن الـtests نجحت وأن الـPR يحتوي التغيير المطلوب."

## النتائج
- إيجابي: نواة حقيقية مُثبتة end-to-end قبل أي توسع.
- ترتيب التنفيذ ملزم (1→12) كما في الدستور.
