# ADR-0002 — Kernel Contracts-only + Agent Plugin

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
إذا عرفت النواة شخصية Agent محددة، يتحول المنتج إلى غلاف فوق LLM ويصبح تغيير المزوّد/إضافة Agent مكلفًا.

## القرار
- الـKernel لا يعرف Claude/Gemini/GPT/Manus ولا أي Agent متخصص — **يعرف Contracts فقط**.
- الـAgent يُسجَّل كـ`AgentContract` في `AgentRegistry` (Plugin/Runtime Component).
- الـKernel **لا يثق بالـAgent تلقائيًا**؛ كل صلاحية عبر Policy Engine.

## النتائج
- إيجابي: إضافة Agent = `registry.register(...)` بلا تعديل على النواة.
- إيجابي: تغيير مزوّد النموذج رخيص (عبر Model Router).
- قيد: أي قدرة جديدة تتطلب عقدًا صريحًا (مقصود).
