# ADR-0007 — State Machines as Code

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
آلة حالة موثقة فقط تسمح بحالات مستحيلة (مثل `PLANNED → COMPLETED`) عبر التطبيق الفعلي.

## القرار
- آلة الانتقال **كود فعلي**: `transition(current, event) → next | throws IllegalTransitionError`.
- جدول الانتقالات هو المصدر الوحيد للقانونية.
- حالات الـTask: `PLANNED | RUNNING | WAITING_APPROVAL | VERIFYING | PAUSED | COMPLETED | FAILED | CANCELLED`.

## النتائج
- إيجابي: الانتقال غير القانوني يفشل في وقت التشغيل (واختبارًا).
- قيد: أي حالة جديدة تتطلب تحديث الجدول + الاختبارات (مقصود).
