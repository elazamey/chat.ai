# ADR-0016 — التنفيذ الموحّد: execute() + CapabilityExecutor

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
دوال متعددة (`runAgent/executeTool/runTask`) تفرّق المنفّذين وتكرر منطق السياسة والأحداث.

## القرار
- `execute(action, input, ctx, registry)` واحدة للجميع.
- المنفّذ `CapabilityExecutor { canExecute, execute }` — لا يهم Agent/Tool/Human/نظام آخر.
- المسار الإلزامي: سياسة → حدث requested → canExecute → تنفيذ → حدث completed/denied → Result.

## النتائج
- إيجابي: نقطة تنفيذ واحدة قابلة للتدقيق (Proof-Carrying).
- قيد: العزل (Sandbox) يطبقه الـworker/الـruntime فوق `execute`، لا داخله.
