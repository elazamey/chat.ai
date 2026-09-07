# ADR-0011 — تقسيم الذاكرة + RAG مستقل

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
خلط "تفضيل المستخدم" مع "سياق المهمة" مع "معرفة المستودع" في مخزن واحد يفسد الاسترجاع.

## القرار
- ذاكرة مقسّمة: `Working / Task / Session / Project / User / Long-Term / Knowledge`.
- **Memory ≠ Knowledge**: Memory = حالة وخبرة؛ Knowledge = معلومات قابلة للاسترجاع.
- خدمات منفصلة: Memory Service / Knowledge Service / Embedding Provider / Vector Store / Retrieval Engine — لتغيير Vector DB دون تغيير الـKernel.

## النتائج
- إيجابي: استرجاع دقيق وعزل واضح للمصادر (Provenance).
- قيد: طبقة استرجاع إضافية (مقصود — منافسة Claude/Manus).
