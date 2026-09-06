# ADR-0019 — Capability Composition (الانشطارية الرسمية)

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
قدرات معزولة غير قابلة للتركيب تعني Agent لكل حالة ورمزًا متكررًا.

## القرار
- `compose(id, ...parts)` تركب `CapabilitySpec[]`/`CapabilitySet` في مجموعة أكبر.
- أمثلة: `SoftwareEngineer` → `ReleaseEngineer` → `AutonomousProjectAgent` دون تعديل النواة.

## النتائج
- إيجابي: الهرم `Capabilities → Compositions → Agents → Workflows → Autonomous Systems`.
- قيد: إلغاء التكرار في التركيب (نفس الفعل لا يتكرر في المجموعة).
