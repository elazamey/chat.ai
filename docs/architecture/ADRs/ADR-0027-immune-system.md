# ADR-0027 — Digital Immune System (Immune Core)

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق

بناء الوكلاء الأقوياء أولًا ثم "إضافة الأمن في النهاية" يكرر خطأ الأمن الملحق. النظام الـAgentic
يتعرض لحقن تعليمات، وتصعيد صلاحيات، وحلقات جامحة، وتسميم أدوات وذاكرة، وعبث بالمصنوعات،
وانهيار اقتصادي (استهلاك غير منضبط للموارد). نحتاج جهازًا مناعيًا **مستقلًا** فوق النواة وتحت
الـAgents/Tools — هدفه ليس منع كل خطأ، بل: **اكتشاف الانحراف مبكرًا، عزله، إيقاف الامتداد،
التعافي، ثم إثبات ما حدث.**

## القرار

- **عقد عليا سابع:** `07 IMMUNE_SYSTEM_CONTRACT.md` + 12 `IMMUNE PRINCIPLE`.
- **الموضع المعماري:** `Atomic Kernel → Immune Interface → Immune Runtime`، والعلاقة:
  `contracts ← kernel ← immune ← runtime ← plugins ← adapters` (طبقة جديدة `immune`).
- **السبعة أعضاء** في `kernel/immune/` (`@aok/immune`): detector · risk-engine · policy-firewall
  · quarantine · recovery · integrity · incident (+ circuit-breaker · kill-switch · health · metrics · gate · runtime).
- **القاعدة الذهبية:** `Agent → request → Immune → Policy → Execution` (لا `Agent → execute`).
  الـGate = Detect → Decide (خالص)؛ الـRuntime = Isolate → Recover → Verify.
- **RiskScore** (0..100 + confidence + reasons + severity) بدل `attack=yes/no`؛
  خمسة مستويات `GREEN/YELLOW/ORANGE/RED/BLACK`.
- **Kill Switch مستقل:** `immune.kill(run|agent|plugin|runner)` — الـAgent يطلب فقط، والقرار يمر عبر Policy.
- **حجر + تعافٍ:** `ACTIVE→SUSPICIOUS→QUARANTINED→ANALYSIS→RECOVERED/REVOKED` +
  Checkpoints (known-good) + مستويات تعافٍ 0..5 بدون تهور.
- **Circuit Breakers** لكل مورد خارجي، و**ميزانيات موارد** تتكامل مع الـEconomic Kernel
  (abnormal usage velocity → kill + quota preserved).
- **دفاعات:** Prompt/Tool/Memory Poisoning مع `InputOrigin` و`Principal` (unknown→minimum trust).
- **مناعة اقتصادية أيضًا:** security + reliability + cost control كجهاز واحد.

## النتائج

- إيجابي: لا يمكن لأي Tool/Agent/Plugin/Runner تجاوز الـGate (مفروض باختبار معماري + اتجاه تبعية)؛
  سيناريوهات حقيقية (injection→block · escalation→block · runaway→kill · tampered artifact→quarantine
  · dependency anomaly→release block · crash→restore→verify) كلها اختبارات مفروضة.
- قيد: `celia safe-mode`/`emergency-lock` حاليًا posture أوامر تشخيصية؛ الإنفاذ الكامل على
  مستوى الـRunner/النشر يأتي مع M3 (Event Store) وM4 (Deployment).
