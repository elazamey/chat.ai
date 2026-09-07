# ADR-0021 — شكل المستودع (kernel / runtime / plugins / adapters / storage)

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
`packages/*` مسطّح لا يعبّر عن الطبقات ولا يجعل الاتجاه ماديًا.

## القرار
```text
apps/       api · cli · console
kernel/     contracts · execution · capability · policy · transition · events
runtime/    scheduler · sandbox (· orchestrator · workers لاحقًا)
plugins/    agents · tools · models · memory · verification
adapters/   vault (· github · mcp · cloud · databases لاحقًا)
storage/    postgres · event-store · object-store (لاحقًا)
tests/      architecture (· contracts · integration · e2e لاحقًا)
docs/       KERNEL_CONSTITUTION · ATOMIC_KERNEL_CONTRACT · ADR/
```

## النتائج
- إيجابي: الطبقة = مجلد مادي؛ الاختبارات المعمارية تفحص المجلدات الفعلية.
- قيد: الحزم أعيدت تسميتها (`@aok/kernel→@aok/transition`, `@aok/ledger→@aok/events`, `@aok/security→@aok/vault`).
