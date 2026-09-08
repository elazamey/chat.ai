# M8 — IDENTITY & ACCESS (الهوية والوصول)

> الترقية من "Actor + Principal جزئي" إلى نظام هوية كامل **مربوط بالـLedger**: كل هوية/صلاحية/سحب قابل للتحقق وإعادة البناء من الأحداث.

| البند | القيمة |
|---|---|
| **الحالة** | `PLANNED` (وثيقة مرجعية معتمدة — التنفيذ بعد M7) |
| **ما قبله** | M7 Monetization · M6 Real E2E + CI · M5 Free Deployment |
| **ما بعده** | M9 Observability + Secrets · M10 HITL + Full Acceptance |

## التعريف (من SYSTEM_OF_SYSTEMS §2 — خطوة البناء 6)

```text
Org / User / Session / Token / Role / Trust / Revocation — مربوطة بالـLedger
الفجوة الحالية (TIER 0): لا Org/Session/Token/Role/AuthN/AuthZ، لا ارتباط بالـLedger
```

## معيار القبول (Definition of Done — قابل للقياس)

```text
100% من منح/سحب الصلاحيات = Event في الـLedger            (append-only، قابل للـreplay)
Token = SecretRef — لا قيمة خام في حالة التطبيق            (قاعدة النواة 7 + vault)
Revocation enforced في PolicyEngine (deny-precedence)       (اختبار: صلاحية مسحوبة → DENIED فوريًا)
كل قرار Policy يحرر من Principal موثّق (id + org + session) (traceability)
Architecture Test: لا password/hash/secret في kernel        (نمط مرفوض يفشل CI)
E2E دورة كاملة: create → issue token → use → rotate → revoke → replay = نفس النتيجة
Chaos: crash بعد revoke → restart → الـtoken المسحوب ما زال مرفوضًا (لا resurrection)
كل claim خارجي (issue/use/revoke) له Evidence قابل للتحقق    (Verification Engine)
```

## المكوّنات

```text
kernel/identity (حزمة جديدة @aok/identity):
  Org · User · Session · Token(=SecretRef) · Role · TrustLevel · Revocation
  IdentityIssuer · TokenValidator · AccessDecision
  IdentityProjector (استرجاع حالة الصلاحيات من الـLedger)
```

## قواعد إلزامية

```text
- الهوية لا تمنح نفسها صلاحية (قاعدة النواة 9)
- كل أثر جانبي (issue/rotate/revoke) → Event (قاعدة 4)
- لا تغيير هوية بدون Audit (Ownership continuity)
- Trust states من immune تبقى المصدر الوحيد لحالة الثقة (لا طبقة موازية)
```

## الحدود (ما ليس في هذه المرحلة)

- لا SSO/OIDC (TIER 2/3 — بعد Full System Test)
- لا RBAC متعدد المستأجرين (Multi-tenancy — TIER 2/3)
- لا مزامنة Directory خارجية
