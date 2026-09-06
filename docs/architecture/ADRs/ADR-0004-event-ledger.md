# ADR-0004 — Event-Driven + Append-Only Ledger

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
نحتاج معرفة "ماذا فعل النظام؟ متى؟ بأي صلاحيات؟ وما الدليل؟" — Logs عادية لا تكفي.

## القرار
- الـKernel **event-driven بالكامل**: `TaskCreated → PlanGenerated → NodeStarted → ToolRequested → ApprovalRequired → … → TaskCompleted`.
- الـLedger **append-only** (لا update/delete) وهو **مصدر الحقيقة**.
- كل حدث مربوط بسابقه: `event_n.hash = hash(payload_n + event_(n-1).hash)` → سلسلة كاشفة للعبث.
- لاحقًا: Merkle Tree + Signed Evidence.

## النتائج
- إيجابي: Replay + Forensics + كشف العبث.
- قيد: حتمية الـhash تتطلب canonical serialization (نُفّذت في `@aok/ledger`).
