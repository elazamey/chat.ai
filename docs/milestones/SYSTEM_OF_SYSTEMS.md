# SYSTEM OF SYSTEMS — خريطة الإغلاق قبل Full System Test

> القرار الاستراتيجي: **لا نبدأ بالـMarketplace أو واجهة ضخمة أو عشرات Agents.**
> الأولوية: إغلاق **TIER 0 + TIER 1**، ثم **Full System Acceptance + Chaos + Security + Recovery + Provenance**.
> الهدف: **نواة ذرية + جهاز مناعي + ذاكرة + تنفيذ معزول + إثبات ملكية + اقتصاد + تعافٍ ذاتي + تشغيل محلي/سحابي** — كله قابل للاختبار بتكلفة $0.

```text
                    SYSTEM OF SYSTEMS
                           │
 ┌─────────────────────────┼─────────────────────────┐
 ▼                         ▼                         ▼
INTELLIGENCE            EXECUTION                TRUST
(Models·Agents·Planner  (Sandbox·Runner·         (Security·Identity·
 Memory·RAG)             Scheduler·Tools·         Ownership·Provenance·
                         Workflow)                Immune)
                           │
                     CONTROL PLANE
                           │
              Storage · Observability · Economics
                           │
                    FULL E2E SYSTEM
```

---

## 1. تحليل الفجوة (الحالة الفعلية اليوم)

### TIER 0 — MUST HAVE

| النظام | الحالة | الفجوة |
|---|---|---|
| Identity | جزئي — `Actor` + immune `Principal` (trust states) | لا Org/Session/Token/Role/AuthN/AuthZ، لا ارتباط بالـLedger |
| Policy | ✅ `PolicyEngine` (grants + deny-precedence + approval) + Enforcement في الـRunner | — |
| Execution | ✅ `execute(action, context)` + `ExecutorRegistry` | — |
| State | جزئي — `Ledger` + `Projection` + `InMemoryEventStore` | غير دائم (M3: Postgres) |
| Ledger | ✅ append-only hash-chained | — |
| Verification | ✅ `VerificationEngine` (no evidence → UNKNOWN) | Verification Chain (متعدد الأنواع) |
| Sandbox | جزئي — `InProcessSandbox` (timeout فقط) | عزل fs/process/network/limits فعلي |
| Immune | ✅ (7 أعضاء + Gate/Runtime) | — |
| Economics | ✅ `UsageMeter` + `BudgetQuota` | Entitlement/Plan |
| Secrets | جزئي — `SecretRef` + `InMemoryVault` + redact | rotation/revocation/scope/audit |
| Provenance | ✅ `@aok/provenance` + Ownership Ledger | — |

### TIER 1 — REQUIRED FOR REAL E2E

| النظام | الحالة | الفجوة |
|---|---|---|
| Scheduler | جزئي — `InProcessScheduler` (FIFO) | retry/timeout/priority/concurrency/cancel |
| Orchestrator | ❌ | تنفيذ Task→Run→Node→Job فعلي |
| Workflow Graph | جزئي — `dag.ts` (validate + topologicalLayers) + state machines | محرك تنفيذ (parallel/conditional/compensation/rollback) |
| Queue | ❌ | `enqueue/dequeue/ack/retry/deadLetter/cancel` + adapters |
| GitHub Adapter | ✅ M2 | — |
| Model Gateway | جزئي — `ModelRouter` + `MockProvider` | retry/fallback/rate-limit/circuit-breaker على الـoutage |
| Memory | جزئي — `InMemoryStore` + `InMemoryKnowledgeStore` (provenance) | write policy/retention/expiration/confidence/verification/deletion |
| Storage | ✅ `@aok/store` — SQLite (dev/test) + Postgres adapter + Projections/Checkpoints/Evidence + DurableLedger | ربط الإسقاطات بالـAPI/الـRunner تلقائيًا |
| Observability | جزئي — Ledger (audit) + immune Health/Metrics | logs/metrics/traces + correlation (traceId) |
| Recovery | جزئي — immune `RecoveryEngine` + breakers | Reliability Engine (bulkhead/fallback/rollback/compensation) |
| Incident | ✅ immune `IncidentEngine` | root cause/postmortem/remediation |

### TIER 2/3 — لاحقًا (بعد Full System Test)
Multi-tenancy · Plugin Registry · Configuration · API Gateway · Feature Flags · Billing · Artifacts · Backup/DR · Versioning · Marketplace · SSO.

---

## 2. ترتيب البناء (الملزم)

```text
(0) Test Harness — Mock World / Failure Injection / Chaos / Replay / Deterministic Clock+IDs  ← هذا العضو أولًا
(1) M3 Persistent Event Store + Storage (Postgres أحداثًا موثوقة + Projections + Checkpoints)
(2) Orchestrator + Workflow Executor (Task→Run→Node→Job فوق الـDAG الموجود)
(3) Queue Abstraction (Local أولًا + Postgres/Redis adapters لاحقًا)
(4) Model Gateway (fallback/retry/rate-limit/circuit-breaker فوق الـRouter)
(5) Memory كاملة (write policy/retention/confidence/verification) + RAG (cite/invalidate/re-index)
(6) Identity & Access (Org/User/Session/Token/Role/Trust/Revocation مربوطة بالـLedger)
(7) Observability (logs/metrics/traces + correlation) + Reliability Engine
(8) Secrets Vault حقيقية (rotation/revocation/scope/audit)
(9) HITL System مستقل (Approval Request/Policy/Identity/Decision/Expiration/Escalation)
(10) Configuration + Feature Flags + Idempotency + Artifact Manager
```

كل خطوة تفرض اختباراتها (unit + architecture + chaos) عبر الـHarness — لا "تجميع بلا اختبار".

---

## 3. الاختبار النهائي: Full System Acceptance (26 خطوة)

```text
 1. Start from clean checkout        14. Export evidence
 2. Build with $0 external spend     15. Kill runner
 3. Start local runner               16. Restart runner
 4. Create task                      17. Replay run
 5. Use model                        18. Restore state
 6. Generate plan                    19. Verify integrity
 7. Request approval                 20. Trigger malicious plugin
 8. Execute against repository       21. Quarantine it
 9. Modify code                      22. Exceed quota
10. Run tests                        23. Verify Cost Guard
11. Commit                           24. Verify ownership/provenance
12. Create PR                        25. Complete task
13. Verify result                    26. (final) report PASS
```

### أثناء التنفيذ نُحقن (Chaos + Security)
Model failure · Tool failure · Network failure · Runner crash · Quota exhaustion ·
Permission escalation · Prompt injection · Plugin tampering · Database restart · Duplicate request.

### النتيجة المطلوبة (الحلقة)
```text
ATTACK/FAILURE → DETECT → CONTAIN → RECORD → RECOVER → VERIFY → RESUME / FAIL-SAFE
```

> إذا نجح هذا السيناريو: **لدينا System، وليس مجرد مجموعة Packages.**

---

## 4. التنفيذ الحالي

- ✅ **Test Harness** — `tests/harness/` (`@aok/harness`): Mock World · Failure Injection · Chaos · Replay · Deterministic Clock/IDs · Fake GitHub/Model/Vault.
- ✅ **M3 Persistent Event Store + Storage** — `storage/store/` (`@aok/store`): `EventStore` + `ProjectionStore` + `CheckpointStore` + `EvidenceStore`
  (SQLite dev/test عبر `node:sqlite`، و`PostgresEventStore` خلف `SqlDriver` للإنتاج) + `DurableLedger` (hydrate/flush/tamper-evident).
- ✅ **System Resurrection Test** — سيناريو القبول 26 خطوة محليًا بـ$0، وخطوات kill/restart/replay أصبحت **حقيقية** (SQLite دائم) مع حقن الهجوم/الفشل والحلقة الكاملة.
- ⏭️ التالي: **Orchestrator + Workflow Executor** (الخطوة 2)، ثم Queue، ثم Model Gateway، ثم Memory/RAG، ثم Identity.
