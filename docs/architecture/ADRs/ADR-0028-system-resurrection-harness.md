# ADR-0028 — System Resurrection Test + Developer/Test Harness

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق

قبل الـFull System Test، نحتاج اختبار **منظومة** لا "ميزة": سيناريو يقبل النظام كاملًا
ويثبت أنه **يكتشف، يعزل، يسجّل، يتعافى، يتحقق، ويستأنف** — وليس مجرد `npm test` أخضر.
الحتمية (Determinism) شرط لكل ذلك، وهي مستحيلة مع `Date.now()`/`randomUUID()` مباشرة.

## القرار

- **حزمة Harness** `tests/harness/` (`@aok/harness`) — عضو مستقل وليس مجرد test suite:
  Mock World · Failure Injection · Chaos Runner · Replay Runner · Deterministic Clock/IDs
  · Fake GitHub/Model/Vault (كلها $0 وحتمية).
- **System Resurrection Test** (`tests/harness/src/system-resurrection.test.ts`):
  سيناريو القبول الكامل (26 خطوة) فوق الأنظمة المكتملة (Kernel + Immune + Economics + Policy
  + Verification + Ledger + Ownership) مع حقن الفشل والهجوم، والتحقق من الحلقة:
  `ATTACK/FAILURE → DETECT → CONTAIN → RECORD → RECOVER → VERIFY → RESUME / FAIL-SAFE`.
- **إعادة البناء من الأحداث:** `replayInto()` يثبت أن إعادة اللعب بنفس تسلسل الـpayload
  تنتج **نفس سلسلة التجزئة** (tamper-evident resurrection) — الـLedger هو الحقيقة.
- **الـRunner يمر عبر Immune Gate بـ`evaluateAndApply`** (وليس evaluate فقط) مع `actorTrust`
  قابل للحقن — حتى نختبر "مكوّن خبيث" عبر المسار الحقيقي وليس وحدة منعزلة.

## النتائج

- إيجابي: الاختبار النهائي قابل للتشغيل محليًا بـ$0، وقابل للتوسع (كل طبقة TIER 1 تُضاف
  تُوسّع السيناريو).
- قيد: خطوات `kill/restart runner` و`execute against real repository` حاليًا simulated
  (in-memory replay + FakeGitHub)؛ تصبح حقيقية مع M3 (Postgres Event Store) وM5 (Real E2E).
