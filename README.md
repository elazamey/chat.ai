# chat.ai — Agent Operating Kernel (AOK)

نظام تشغيل للوكلاء (Agent Operating System) ينافس Manus وClaude Code عبر الفصل الصارم بين
التفكير، التنفيذ، الأدوات، الذاكرة، الأمان، والتحقق — وليس مجرد Chatbot أو Agent واحد.

```text
Intent → Task → Plan → Policy → Execution → Evidence → Verification → Outcome → Audit
```

## الوثائق المرجعية

- 📜 **[الدستور الهندسي](docs/architecture/CONSTITUTION.md)** — القرارات الملزمة (C1–C25) وترتيب التنفيذ.
- 🗂️ **[سجل القرارات المعمارية (ADRs)](docs/architecture/ADRs/)** — كل قرار مع سياقه ونتائجه.
- 📄 **[Architecture Contract v1](docs/ARCHITECTURE_CONTRACT_V1.md)** — المرجع التفصيلي للعقود والـAPIs وآلات الحالة.

## الثوابت الجوهرية

- الـKernel **لا يعرف** Claude/Gemini/GPT/Manus ولا أي Agent — يعرف **Contracts فقط**، والـAgent هو **Plugin**.
- كل فعل هو **Event** في **Ledger append-only** بسلسلة تجزئة كاشفة للعبث (مصدر الحقيقة).
- **"تم بنجاح" ممنوع**: `Claim → Evidence → Verification {PASSED|FAILED|UNKNOWN}` — ولا `PASSED` بدون دليل.
- أمان **Capability-based** (لا `admin`): deny يسبق allow، والموافقة policy-driven.
- آلات الحالة **كود فعلي** يرفض الانتقال غير القانوني (لا `PLANNED → COMPLETED`).
- الأسرار خارج النواة (`SecretRef → Vault → Short-lived credential`)؛ النموذج **لا يقرر السلطة**.

## البنية (Monorepo)

```text
/apps       control-plane · cli · api        (قادم — API-first، CLI = celia)
/packages
  contracts      العقود المشتركة (Zod/TS)
  kernel         آلات الحالة + الـTask Graph (DAG)
  policy         الـPolicy Engine (Capability-based)
  ledger         الـLedger append-only + سلسلة التجزئة
  security       الـVault + تعمية الأسرار
  verification   محرك التحقق (Claim→Evidence→Verdict)
  tools          Tool Registry + Shell مقيّد
  agents         Agent Registry (Plugin)
  models         Model Router
  sandbox        Sandbox Manager (عقد العزل)
  memory         Memory + Knowledge (منفصلان)
  scheduler      جدولة داخل العملية
/docs       architecture · ADRs
```

## التشغيل

```bash
corepack enable            # تفعيل pnpm
pnpm install
pnpm test                  # Vitest
pnpm typecheck             # tsc --noEmit لكل الحزم
```

## الدفع التلقائي إلى المستودع

كل `commit` يدفع الفرع الحالي إلى `origin` فورًا (hook داخل المستودع):

```bash
bash scripts/setup-hooks.sh   # التفعيل لأي نسخة جديدة
```

## الحالة

`IN_PROGRESS` — الأساس (عقود النواة + الأمان + الـLedger + آلات الحالة + الأدوات +
التحقق + الـSandbox + الـModel Router + الـAgent Plugin + الذاكرة) منفَّذ مع اختبارات.
التالي وفقًا للدستور: **APIs (11) → UI/CLI (12) → الـVertical Slice end-to-end**.
