# M9 — OBSERVABILITY + SECRETS VAULT (المراقبة والأسرار الحقيقية)

> رؤية كاملة في $0 (محليًا): كل حدث قابل للتتبع بعلاقة واحدة، وكل سر بخريطة دورة حياة صارمة — بلا أي sink خارجي إلزامي.

| البند | القيمة |
|---|---|
| **الحالة** | `PLANNED` (وثيقة مرجعية معتمدة — التنفيذ بعد M8) |
| **ما قبله** | M8 Identity & Access |
| **ما بعده** | M10 HITL + Full System Acceptance |

## التعريف (من SYSTEM_OF_SYSTEMS §2 — خطوات البناء 7 و8)

```text
(7) Observability: logs/metrics/traces + correlation + Reliability Engine
(8) Secrets Vault حقيقية: rotation / revocation / scope / audit
الحالي: InMemoryVault (MVP) + immune metrics جزئي — لا correlation، لا rotation
```

## معيار القبول (Definition of Done — قابل للقياس)

### Observability
```text
100% من الـEvents تحمل correlation id (task/run/node)          (Architecture Test)
كل run قابل لإعادة التتبع: Task → Plan → Execution → Evidence   (replay من الـLedger)
Metrics + Logs محلية $0 (ملف/SQLite) — لا sink خارجي إلزامي    (عقد §17)
Reliability: retry/timeouts/circuit-state مرئية كمقاييس، لا تخمين
```

### Secrets Vault
```text
Rotation: rotate(secretId) → القيمة القديمة مرفوضة فوريًا        (اختبار)
Scope: كل secret بـscope صريح (service + actions) — استخدام خارج scope = DENY
Revocation: revoke → لا استخدام لاحق (حتى بعد crash/restart)     (chaos)
Audit: كل access/rotate/revoke → Event موقّع بالـLedger           (replay = نفس النتائج)
لا سر خام في: state · logs · events · images                     (scan موسع يفشل CI)
Postgres/encrypted-at-rest adapter خلف نفس واجهة vault           (M3 pattern)
```

## المكوّنات

```text
kernel/observability (حزمة جديدة @aok/observability):
  CorrelationId · TraceContext · LogSink (local file/SQLite) · MetricsExporter
runtime/vault-hardening (داخل adapters/vault):
  RotationScheduler · ScopeEnforcer · AuditTrail · PostgresVault
```

## قواعد إلزامية

```text
- لا مراقبة تكتب أسرارًا (redaction مفروضة باختبار)
- لا sink خارجي بدون قرار Policy صريح (Capability)
- كل مقياس/سجل قابل لإعادة البناء من الـLedger (قاعدة 8: الحالة من الأحداث)
```

## الحدود (ما ليس في هذه المرحلة)

- لا export إلى SaaS (Datadog/Grafana cloud إلخ) — local-only، الـexport قرار لاحق
- لا SIEM integration (TIER 2/3)
- لا HSM — crypto محلي + كيبخزنة OS عند النشر
