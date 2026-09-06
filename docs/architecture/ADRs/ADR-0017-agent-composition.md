# ADR-0017 — الـAgent = Composition (وليس Class بذكاء)

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
`Agent = class with intelligence` يجعل كل Agent جديد يتطلب كودًا ويربط النواة به.

## القرار
```text
Agent = Policy + Model + Memory + Planner + Capabilities + Runtime
```
- الـAgent **بيان تركيب** (قدرات + مكوّنات) يُبنى عبر `compose(...)`.
- إنشاء Agent جديد **دون كتابة Kernel code**.

## النتائج
- إيجابي: الوحدة الأساسية هي **Capability**، والـAgent مجرد تركيب أعلى.
- قيد: قدرة جديدة تتطلب `CapabilitySpec` + (اختياريًا) منفّذًا مسجّلًا.
