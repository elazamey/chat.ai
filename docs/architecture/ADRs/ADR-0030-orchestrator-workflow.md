# ADR-0030 — M4: Orchestrator + Workflow Executor

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق

بعد M3 (Event Store دائم) تبقى الحلقة المفقودة: آلة تنفيذ تحوّل الـTask إلى تنفيذ فعلي
فوق النواة، مع إثبات أن كل ما بُني يعمل **كنظام واحد** لا كمكوّنات ناجحة منفردة.

## القرار

- **`runtime/orchestrator/` (`@aok/orchestrator`)** — آلة تنفيذ صغيرة (ليست "مديرًا كبيرًا"):
  `Task → Run → PlanGraph → Scheduler → Node → Job → Capability → Execution → Event → Verification`.
- **لا يملك** Policy/Ledger/Secrets/Model logic/Tool implementation/Storage internals —
  يستدعيها عبر واجهات محقونة (`NodeHandler` → `execute()`، `LedgerLike`+`onPersist` → `DurableLedger`،
  `Scheduler`/`JobQueue` → نقل مجهول، `FailureGuard` → Immune System).
- **DAG Executor** يدعم: sequential · parallel · conditional · dependency · retry · timeout ·
  approval · compensation · rollback · cancellation.
- **Scheduler مستقل** (`enqueue/cancel/retry` + `dequeue` للاستهلاك) — in-process الآن،
  Postgres/Redis/cloud لاحقًا خلف نفس العقد.
- **Idempotency** ضرورية قبل parallel/retry: كل Job يملك `operationId` + `attempt` + `idempotencyKey`؛
  التسليم المكرر يعيد استخدام النتيجة (لا أثر جانبي مكرر).
- **Compensation بدل Rollback الوهمي**: forward action + compensation action اختيارية؛
  `{ irreversible: true }` للعمليات غير القابلة للتراجع (email/external mutation).
- **RetryPolicy**: `maxAttempts` + `backoff` (fixed/exponential) + `retryableErrors` + `jitter`،
  مع تكامل Immune: repeated failure → risk → circuit breaker → stop.
- **ApprovalNode** عقدة حقيقية داخل الـDAG (Test → Approval → Deploy).
- **Bulkhead**: `maxConcurrentJobs` + per-agent/per-tenant/per-tool — مرتبط بـImmune + Cost Guard.
- **آلة حالة قانونية** (state machines as code): `PLANNED→READY→RUNNING→WAITING→VERIFYING→COMPLETED`،
  `RUNNING→FAILED→RETRYING→RUNNING`، `FAILED→COMPENSATING→ROLLED_BACK`، `FAILED→QUARANTINED` —
  لا انتقالات مباشرة غير قانونية.
- **Crash Recovery**: كل انتقال يُثبَّت كحدث؛ `hydrate(events)` يعيد بناء الـgraph والحالة
  والـidempotency، و`resume()` يكمل من نقطة التوقف.

## النتائج

- إيجابي: اختبار القتل/الاستئناف الحقيقي (SQLite) يثبت NO duplicate side effect / NO lost state /
  NO corrupted ledger / NO bypass of quota/approval.
- قيد: at-least-once delivery؛ النافذة بين side effect وتسجيل اكتماله تتطلب قدرات idempotent
  (توثَّق عبر `idempotencyKey`)، والـdedup يعتمد على إعادة التشغيل.
