# M5 — FREE DEPLOYMENT (نشر مجاني بتكلفة صفر)

> تنفيذ `ZERO-COST-ECONOMIC-CONTRACT` §18 "Deploy على الطبقة المجانية": صورة تشغيل واحدة تُبنى من مستودع نظيف بـ$0 وتعمل دون أي خدمة خارجية — قبل أي طبقة مدفوعة أو Cloud.

| البند | القيمة |
|---|---|
| **الحالة** | `IN_PROGRESS` |
| **ما قبله** | M3 Persistent Event Store ✅ · M4 Orchestrator ✅ · Local Runner + MockProvider ✅ |
| **ما بعده** | M6 Real E2E + CI (هذا البوابة هي بذرتها) · M7 Monetization |

## المبدأ الاقتصادي الحاكم

```text
Zero-Cost-to-Deploy: صفر تكلفة حتى أول مستخدم وأول إيراد (عقد §17)
BYOK: لا تبيع Tokens — النموذج $0 حتمي (MockProvider) أو مفتاح المستخدم
--network none: لا شبكة خارجية مطلوبة للتشغيل الأساسي (اختبار عقدي)
```

## معيار القبول (Definition of Done — قابل للقياس)

```text
[x] بوابة $0 على checkout نظيف          (CI: pnpm frozen install + typecheck + test)
[x] صورة حاوية واحدة من جذر المستودع    (Dockerfile + .dockerignore)
[ ] CI: بناء الحاوية + smoke داخلها      (celia health + celia run — --network none)
[ ] توثيق مسارات النشر المجانية          (docs/deployment/: local · container · free tier)
[ ] صورة multi-stage محسّنة              (بعد ثبوت البوابة — تحسين، لا شرط)
[ ] النشر الفعلي على طبقة مجانية (Workers/Pages للـControl Plane)  (عقد §18 "قادم")
```

## البوابة (Free Deployment Gate)

`.github/workflows/ci.yml` — على كل push/PR إلى `main`:

```text
clean checkout → pnpm install --frozen-lockfile → typecheck → test
→ docker build → docker run --network none:
    celia health      (Immune snapshot + metrics)
    celia run "..."   (MockProvider — verdict + evidence بلا شبكة)
```

فشل أي مرحلة = فشل البوابة. لا "تجميع بلا تحقق" (SYSTEM_OF_SYSTEMS §2).

## المسار

```text
(1) Dockerfile + .dockerignore + ci.yml          ← هذا الـcommit
(2) ملاحظة CI خضراء على البوابة كاملة
(3) docs/deployment/FREE_DEPLOYMENT.md (مسارات: local dev · container · free tier)
(4) multi-stage image + حجم صورة مُوثَّق
(5) Control Plane على طبقة مجانية (عقد §7: Cloud → Your Runner)
```

## الحدود (ما ليس في هذه المرحلة)

- لا Marketplace ولا Managed Cloud ولا Enterprise (عقد §18 — قادم لاحقًا).
- لا قاعدة بيانات سحابية: SQLite محلي (M3) + Postgres adapter اختياري خلف نفس الواجهة.
- لا أسرار في الصورة: BYOK عبر `SecretRef` عند التشغيل فقط (قاعدة النواة 7).

## التبعية (مفروضة بالكود)

```text
ci.yml → Dockerfile → monorepo (pnpm workspace) → celia CLI (ADR-0014)
Dockerfile لا يعتمد على أي خدمة خارجية (no build args secrets, no private registry)
```
