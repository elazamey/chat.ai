# M10 — HITL SYSTEM + FULL SYSTEM ACCEPTANCE (قرار الإنسان + اختبار القبول النهائي)

> البوابة الأخيرة قبل "System وليس مجرد Packages": قرارات بشرية مستقلة عن النواة، وإعدادات قابلة للعزل، والسيناريو النهائي 26 خطوة مع حقن الفشل/الهجوم.

| البند | القيمة |
|---|---|
| **الحالة** | `PLANNED` (وثيقة مرجعية معتمدة — التنفيذ بعد M9) |
| **ما قبله** | M9 Observability + Secrets |
| **ما بعده** | TIER 2/3 (Marketplace · SSO · Multi-tenancy · Billing) |

## التعريف (من SYSTEM_OF_SYSTEMS §2 — خطوات البناء 9 و10 + §3 الاختبار النهائي)

```text
(9)  HITL System مستقل: Approval Request / Policy / Identity / Decision / Expiration / Escalation
(10) Configuration + Feature Flags + Idempotency + Artifact Manager
(3)  Full System Acceptance: 26 خطوة + حقن Chaos/Security
الحالي: ApprovalPolicy داخل local-runner (MVP) — ليس نظامًا مستقلًا
```

## معيار القبول (Definition of Done — قابل للقياس)

### HITL
```text
Approval Request ككيان مستقل (id · requester(M8) · policy · deadline · status)
Decision (grant/deny/escalate) = Event في الـLedger من Principal بشري موثّق
Expiration: request منتهٍ → أي execution = DENIED (اختبار زمني حتمي)
Escalation: سياسة تصعيد واضحة (من/إلى/متى) + سجل كامل
لا Agent يمنح نفسه موافقة (قاعدة 9 — Architecture Test)
```

### Configuration / Flags / Artifacts
```text
Feature Flags محيطة بأي سلوك جديد — الإطفاء يعيد النظام لحالته السابقة (اختبار)
Configuration بلا أسرار (قاعدة 7) + validation بالمخططات (zod)
Artifact Manager: كل مخرج خارجي مسجّل (hash + provenance) في الـLedger
```

### Full System Acceptance (السيناريو 26 خطوة)
```text
النجاح الكامل بدون تدخّل يدوي في صورة الحاوية (M5) بـ$0:
clean → build → run → task → model → plan → approval(HITL) → execute(repo)
→ code change → tests → commit → PR → verify → evidence → kill → restart
→ replay → restore → integrity → attack → quarantine → quota → cost-guard
→ ownership → complete → report PASS
حقن إلزامي أثناء التنفيذ:
Model failure · Tool failure · Network failure · Runner crash · Quota exhaustion
· Permission escalation · Prompt injection · Plugin tampering · DB restart · Duplicate
حلقة الإغلاق:
ATTACK/FAILURE → DETECT → CONTAIN → RECORD → RECOVER → VERIFY → RESUME / FAIL-SAFE
```

## المكوّنات

```text
kernel/hitl (حزمة جديدة @aok/hitl):
  ApprovalRequest · ApprovalPolicyEngine · DecisionRecord · EscalationPolicy
kernel/config (داخل contracts + runtime):
  ConfigSchema · FeatureFlag (deterministic) · ArtifactManifest
tests/acceptance (فوق @aok/harness):
  26-Step Scenario في الـcontainer + حقن + تقرير PASS/FAIL آلي
```

## قواعد إلزامية

```text
- لا خطوة قبول بدون Evidence (Execution Success ≠ Verified Success)
- كل حقن فشل له scenario ثابت (Deterministic Clock/IDs — @aok/harness)
- تقرير الـPASS يُصدَّر كـevidence bundle (Provenance)
```

## الحدود (ما ليس في هذه المرحلة)

- لا Multi-tenancy ولا Billing حقيقي (TIER 2/3)
- لا UI لإدارة الموافقات — CLI/API فقط في هذه المرحلة
