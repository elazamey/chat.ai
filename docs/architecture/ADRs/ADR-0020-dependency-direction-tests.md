# ADR-0020 — اتجاه التبعية + Architecture Tests

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
قوانين معمارية مكتوبة فقط لا تُفرض، وتتحول النواة مع الوقت إلى غلاف مشوّش.

## القرار
- القانون: `Contracts ← Kernel ← Runtime ← Plugins ← Adapters` (الاتجاه لا ينعكس).
- **Architecture Tests** في `tests/architecture/` تفرض بالكود:
  - kernel/runtime لا يستورد plugins/adapters.
  - كل حزمة تعتمد فقط على طبقاتها المسموحة.
  - tools تستخدم Capability، execution يبث Events، ledger append-only.

## النتائج
- إيجابي: كسر القانون يفشل في CI (حظر التعقيد، وليس أمان فقط).
- قيد: أي حزمة جديدة يجب أن تُسجَّل في `LAYERS` + `ALLOWED_DEPS`.
