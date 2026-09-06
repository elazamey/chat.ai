# chat.ai — Agent Operating Kernel (AOK)

نظام تشغيل للوكلاء (Agent Operating Kernel) ينافس Manus وClaude عبر الفصل الصارم بين
التفكير، التنفيذ، الأدوات، الذاكرة، الأمان، والتحقق — وليس مجرد Chatbot أو Agent واحد.

## الوثيقة المرجعية

العقد المعماري هو المصدر الوحيد للحقيقة قبل أي تنفيذ:

- 📄 [Architecture Contract v1](docs/ARCHITECTURE_CONTRACT_V1.md)

يغطي العقد: أسماء الخدمات، الواجهات (interfaces)، المخططات (schemas)، آلات الحالة
(state machines)، الـAPIs، الحدود الأمنية، ومراحل الـMVP.

## الثوابت الجوهرية

- الـKernel لا يعتمد على شخصية Agent محددة — الـAgent هو Plugin.
- كل فعل هو حدث مسجَّل في Execution Ledger (قابل للـReplay والتدقيق).
- لا تنفيذ بدون عقد (ToolContract / AgentContract / ModelContract).
- "تم" لا تكفي — كل ادعاء يمر عبر Verification → PASS / FAIL / UNKNOWN.
- قابل للاستئناف بعد الفشل (Checkpoint/Resume + Idempotency).
- نموذج-محايد عبر Model Router، وعزل صارم عبر Security Kernel.

## الدفع التلقائي إلى المستودع

المستودع مفعّل للدفع التلقائي: كل `commit` يدفع الفرع الحالي إلى `origin` فورًا.

- الـhook: [`.githooks/post-commit`](.githooks/post-commit)
- التفعيل لأي نسخة جديدة من المستودع:

  ```bash
  bash scripts/setup-hooks.sh
  ```

  (يضبط `core.hooksPath = .githooks` ويمنح الـhook صلاحية التنفيذ)

## الحالة

`FOR_REVIEW` — العقد v1 جاهز للمراجعة قبل بدء المرحلة M0.
