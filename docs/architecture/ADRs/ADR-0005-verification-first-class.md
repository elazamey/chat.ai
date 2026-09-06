# ADR-0005 — Verification First-Class ("تم" ممنوع)

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
Agent يستطيع قول `done`، لكن الـKernel يجب ألا يصدّق.

## القرار
- المسار الإلزامي: `EXECUTION → RESULT → EVIDENCE → VERIFICATION → ACCEPTED`.
- الـVerification **خدمة من الدرجة الأولى** (وليس helper): `Claim → Evidence → Verification {PENDING|PASSED|FAILED|UNKNOWN}`.
- قاعدة صارمة: **لا `PASSED` بدون Evidence** (يدفن "تم بنجاح").

## النتائج
- إيجابي: النظام يقول "أنا أثبت أنني نفذت" وليس "أنا نفذت".
- قيد: كل ادعاء إنجاز يتطلب أدلة قابلة للتحقق (commit/CI/endpoint/health check).
