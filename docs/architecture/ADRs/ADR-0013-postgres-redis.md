# ADR-0013 — PostgreSQL أساسي + Redis غير إلزامي

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
نحتاج جاهزية إنتاج: transactions / concurrency / JSONB / indexes / advisory locks / event persistence.

## القرار
- **PostgreSQL** للنواة الإنتاجية من البداية.
- **SQLite** للـ local/dev/test فقط.
- **Redis** ليس في الـMVP: البداية Postgres + in-process scheduler، ثم Redis (queues/cache/pub-sub) عند الحاجة.

## النتائج
- إيجابي: الـLedger وذاكرة الأحداث تعيش في Postgres (append-only + فهارس).
- قيد: سائق DB يتطلب طبقة تخزين خلف العقد (لاحقًا في apps/api).
