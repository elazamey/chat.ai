# ADR-0015 — النواة الذرية: البدائيات الأربعة + Ontology-Neutral

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
نواة تعرف Task/Agent/Tool كنوع خاص تصبح مرتبطة بها، وأي نوع جديد يتطلب تعديلها.

## القرار
- البدائيات: **Entity / Event / Capability / Result** فقط.
- الـKernel **ontology-neutral**: لا `Task/Agent/Tool` كنوع، بل `Entity` بنوعه (`entity:task`, `entity:agent`, …).
- الفعل Primitive واحد: `execute(action, context)` بدل `runAgent/executeTool/runTask`.

## النتائج
- إيجابي: إضافة أنواع جديدة دون تعديل النواة.
- قيد: أنواع المجال (Task/Run/…) تبقى في `contracts` كطبقة فوق البدائيات، لا داخل النواة التنفيذية.
