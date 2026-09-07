# ADR-0029 — M3: Persistent Event Store + Storage

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق

الـLedger في الذاكرة لا يكفي لاختبار حقيقي: `crash/restart/network loss/worker loss/partial execution`
تتطلب مصدر حقيقة دائمًا، والـState يجب أن يُعاد بناؤه من الأحداث (`Events → Reducers → Projection`).

## القرار

- **حزمة `storage/store/` (`@aok/store`)** بعقود واضحة: `EventStore` · `ProjectionStore` · `CheckpointStore` · `EvidenceStore`.
- **SQLite (dev/test فقط — ADR-0013)** عبر `node:sqlite` (Node 22)، محمّل بـ`createRequire` لتجاوز
  Vite 5 الذي لا يعرف الـbuiltin الجديد، وأنواعه معرّفة محليًا.
- **Postgres (إنتاج)** عبر `PostgresEventStore` خلف `SqlDriver` مجرد (يُربَط بـ`pg` عند النشر —
  Zero-Cost/offline الآن).
- **`DurableLedger extends Ledger`**: `append()` يبقى sync (لا يغيّر عقد النواة)، `flush()` يثبّت ذرّيًا،
  و`hydrate()` يعيد البناء من القرص مع التحقق من سلسلة التجزئة (tamper-evident).
- **الـRunner يقبل `ledger?`** (DurableLedger) ويثبّت الأحداث تلقائيًا في نهاية الـrun.
- **الإسقاطات** `runs/approvals/usage` تُشتق من الأحداث (`projectSystem`).

## النتائج

- إيجابي: خطوات kill/restart/replay في System Resurrection Test أصبحت **حقيقية**
  (SQLite دائم) بدل المحاكاة؛ العبث يُكتشف عند الـhydrate.
- قيد: SQLite خلف `node:sqlite` تجريبي (ExperimentalWarning)؛ الانتقال إلى Postgres يمر عبر
  `SqlDriver` دون تغيير العقود.
