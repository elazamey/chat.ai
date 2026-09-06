# ADR-0018 — الحالة Projection (Event Store → Reducers → State)

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
حالة يحتفظ بها الـAgent (`this.state`) غير قابلة للإعادة ولا للتدقيق.

## القرار
```text
System state = replay(Event[])
```
- الحالة **مشتقة** من الأحداث عبر Reducers (Task/Run/Approval/Ledger/Verification Projections).
- **الـLedger هو الحقيقة**؛ Memory وKnowledge مجرد projections قابلة لإعادة البناء.

## النتائج
- إيجابي: Replay / Debug / Audit / Forensics / Time travel شبه مجانية معماريًا.
- قيد: حتمية الـreducer شرط (نفس الأحداث = نفس الحالة).
