# ADR-0023 — Control Plane / Execution Plane + Local Runner

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
جعل الـCloud مكان التنفيذ الإجباري يجعل كل مستخدم يكلّف CPU/RAM/Storage/LLM/Browser.

## القرار
- فصل **Control Plane** (Identity/Tasks/Policies/Ledger/UI/Scheduling) عن **Execution Plane** (Code/Browser/Shell/Docker/Heavy execution).
- **Cloud Control + Local Execution** — بفلسفة GitHub Actions runners.
- `celia runner install|connect|start` — الـRunner منتج بذاته، ومفتوح المصدر؛ أنت لا تدفع compute المستخدم.
- `CELIA_MODE=local|cloud` يبدّل adapters فقط، ولا يتغير الـKernel.

## النتائج
- إيجابي: لا حاجة لسيرفر CPU دائم في النسخة المجانية؛ cloud يحتفظ بـcontrol/audit/state.
- قيد: ثقيل الـexecution لا يوضع داخل Cloudflare Worker (حدود CPU/طلبات) — يوضع في الـRunner.
