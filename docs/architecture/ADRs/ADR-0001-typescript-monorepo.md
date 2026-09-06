# ADR-0001 — TypeScript + Monorepo + pnpm

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
النظام كثيف الأنواع: `Task → Plan → Node → Tool → Job → Approval → Evidence → Verification`. نحتاج عقود Typed صارمة ومشتركة عبر النواة والواجهات.

## القرار
- النواة/الـControl Plane/العقود/الـCLI: **TypeScript + Node.js (>=18)**.
- العقود: **Zod** (المصدر) ← **JSON Schema** ← **OpenAPI** (اشتقاق).
- الاختبارات: **Vitest**. مدير الحزم: **pnpm** (workspace).
- **Python**: Runtime اختياري للـAgents/Tools عند الحاجة (AI/Data Science).

## النتائج
- عقد واحد مشترك في `@aok/contracts` تستهلكه كل الحزم.
- إيجابي: أمان أنواع عبر كل الطبقات + مشاركة العقود مع الواجهات.
- سلبي: الـKernel في Node أقل عزلًا أصلًا من Go/Rust — يُعالَج عبر الـSandbox (C9/ADR-0009).
