# IMMUNE SYSTEM CONTRACT v1 — عقد الجهاز المناعي (07)

> **الموضع:** فوق النواة وتحت الـAgents/Tools، وليس جزءًا من الـKernel المنطقي.
> **العلاقة:** `Atomic Kernel → Immune Interface → Immune Runtime`.
> **الهدف ليس منع كل خطأ** — بل: **اكتشاف الانحراف مبكرًا، عزله، إيقاف الامتداد، التعافي، ثم إثبات ما حدث.**
> التنفيذ الفعلي في `kernel/immune/` (`@aok/immune`)؛ هذا العقد هو القانون، والكود هو التطبيق.

```text
                    ATOMIC KERNEL
                          │
             ┌────────────┴────────────┐
             │    IMMUNE SYSTEM       │
             │  Detect → Decide       │
             │  Isolate → Recover     │
             │  Verify → Learn        │
             └────────────┬───────────┘
                          │
       ┌──────────┬───────┼────────┬──────────┐
       ▼          ▼       ▼        ▼          ▼
   Agents      Tools    Models   Runner     Storage
```

---

## المبادئ الاثنا عشر (غير قابلة للتفاوض)

```text
IMMUNE PRINCIPLE 001
No privileged action bypasses immune policy.

IMMUNE PRINCIPLE 002
Unknown components start with minimum trust.

IMMUNE PRINCIPLE 003
Security failure defaults to safe isolation (fail-closed).

IMMUNE PRINCIPLE 004
The LLM cannot disable or modify immune policy.

IMMUNE PRINCIPLE 005
Every incident produces immutable evidence.

IMMUNE PRINCIPLE 006
Every external boundary has a circuit breaker.

IMMUNE PRINCIPLE 007
Every execution has a bounded blast radius.

IMMUNE PRINCIPLE 008
Recovery requires verification.

IMMUNE PRINCIPLE 009
A recovered system is not trusted until integrity passes.

IMMUNE PRINCIPLE 010
Memory and external content are untrusted by default.

IMMUNE PRINCIPLE 011
Automatic remediation cannot expand privilege.

IMMUNE PRINCIPLE 012
The immune subsystem itself must be observable and testable.
```

---

## 1. السبعة أعضاء

| العضو | الملف | الدور |
|---|---|---|
| Detector | `detector.ts` | اكتشاف anomaly / policy violation / unexpected transition / abnormal tool usage / credential misuse / dependency drift / artifact tampering / resource exhaustion / repeated failures |
| Risk Engine | `risk-engine.ts` | درجة 0..100 + ثقة + أسباب + شدّة (ليست `attack=yes/no`) |
| Policy Firewall | `policy-firewall.ts` | القاعدة الذهبية: deny-by-default قبل أي تنفيذ |
| Quarantine | `quarantine.ts` | العزل + قيود (read-only / network off / creds revoked / processes blocked / plugin disabled) |
| Recovery | `recovery.ts` | Checkpoints + known-good state + مستويات 0..5 |
| Integrity | `integrity.ts` | expected hash ≠ runtime hash → INTEGRITY_BREACH |
| Incident | `incident.ts` | detect→classify→contain→preserve→recover→verify + دليل immutable |

---

## 2. Risk Engine — درجات لا أحكام

```ts
interface RiskScore {
  score: number;        // 0..100
  confidence: number;   // 0..1
  reasons: RiskReason[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}
```

| الإشارة | الدرجة |
|---|---|
| Normal tool call | 5 |
| Unusual tool sequence | 30 |
| Permission escalation | 60 |
| Secret access anomaly | 85 |
| Ledger tampering attempt | 95 |
| Kernel integrity failure | 100 |

الدرجة **قرار تشغيل آلي** وليست حكمًا قضائيًا.

---

## 3. مستويات المناعة الخمسة

```text
GREEN → YELLOW → ORANGE → RED → BLACK
```

| المستوى | المعنى | الإجراء |
|---|---|---|
| GREEN | تشغيل طبيعي | allow |
| YELLOW | مراقبة إضافية | monitor (+evidence) |
| ORANGE | تقليل الصلاحيات | restrict (network off · no write · no secrets) |
| RED | Quarantine | stop execution · freeze capabilities · capture evidence |
| BLACK | بيئة غير موثوقة | disable runner · revoke session · rotate credentials · restore known-good |

---

## 4. القاعدة الذهبية

النظام **لا يفترض أن الـAgent حسن النية**:

```text
Agent → request → Immune System → Policy → Execution
```

وليس `Agent → execute` — حتى لو كان الـAgent "موثوقًا".

---

## 5. Autonomous Kill Switch

```text
immune.kill(runId) · immune.kill(agentId) · immune.kill(pluginId) · immune.kill(runnerId)
```

وليس `agent.kill(anything)` — الـAgent يستطيع **طلب** الإيقاف، لكن القرار يمر عبر Policy.
(`kill-switch.ts`: طلب من `agent:`/`tool:` بدون موافقة Policy يُرفض.)

---

## 6. Quarantine

```text
ACTIVE → SUSPICIOUS → QUARANTINED → ANALYSIS → RECOVERED / REVOKED
```

داخل الحجر:

```text
filesystem = read-only · network = blocked · credentials = revoked
new processes = blocked · plugin = disabled
```

---

## 7. Snapshots قبل العمليات الحساسة

قبل `migration / deployment / mass file changes / dependency upgrade / configuration mutation`
نُنشئ `checkpoint` (known-good snapshot). عند الانهيار: `failure → stop → snapshot selection → restore → verify`.

---

## 8. Self-Healing بدون تهور

| المستوى | الإجراء |
|---|---|
| 0 | retry |
| 1 | restart component |
| 2 | rollback transaction |
| 3 | restore checkpoint |
| 4 | isolate environment |
| 5 | require human approval |

**ممنوع:** "حدث خطأ، دعني أصلح كل شيء."

---

## 9. Circuit Breaker — لكل مورد خارجي

```text
closed → (failure threshold) → open → (cooldown) → half-open → (healthy) → closed
```

لـ `GitHub / Model Provider / Database / Cloudflare / MCP / Browser` — إذا انهار GitHub لا تستمر آلاف الـAgents في ضربه.

---

## 10. Resource Immune System (يتكامل مع Economic Kernel)

`CPU · RAM · disk · network · process · tool-call · model-call · execution-time budgets`.
انهيار قد يكون ماليًا: `Agent loop → 100k model calls → quota explosion`.
المناعة ترى **abnormal usage velocity** فتقطع: `Execution stopped · Quota preserved · Incident recorded`.

---

## 11. دفاعات الحقن والتسميم

| الدفاع | القاعدة |
|---|---|
| Prompt Injection | فصل `instruction` عن `data/tool result/external content`؛ `InputOrigin` لكل input |
| Tool Poisoning | Tool Output → Sanitization → Provenance → Risk analysis → Agent context |
| Memory Poisoning | كل Memory write يتطلب `source/confidence/timestamp/actor/evidence/scope/expiration`؛ حالات `provisional/verified/trusted/revoked` |

```ts
interface InputOrigin {
  source: "system" | "user" | "tool" | "repository" | "web" | "memory" | "model";
  trustLevel: number;
}
```

`External text ≠ System instruction` (IMMUNE PRINCIPLE 010).

---

## 12. Identity Immune Layer

لكل `User/Agent/Runner/Plugin/Tool/Model/Service` هوية:

```ts
interface Principal {
  id: string;
  type: PrincipalType;
  trust: TrustState;
  credentials: CredentialRef[]; // مراجع فقط، لا قيم
}
```

`unknown → privileged` ممنوع (IMMUNE PRINCIPLE 002).

---

## 13. Plugin Immunity

```text
Download → Hash → Manifest → Dependency scan → Permission analysis
→ Signature verification → Sandbox test → Trust classification → Install
```

الـPlugin يبدأ `trust = UNKNOWN` ثم `VERIFIED` بعد اجتياز الشروط.

---

## 14. Dependency Immune System

مراقبة `version drift · new transitive · install scripts · known vulnerability · license change · maintainer change · network dependency`.
شديد الخطورة → **BLOCK RELEASE** (وليس "continue because tests passed").

---

## 15. Integrity Guardian

يراقب `kernel / contracts / policy / ownership / plugins / release / runner`.
`expected hash ≠ runtime hash` → `INTEGRITY_BREACH` → `quarantine + evidence + shutdown sensitive capabilities`.

---

## 16. Immutable Evidence

```text
Incident → Evidence Capture → Append-only Ledger → Hash chain → External archive
```

المهاجم لا يستطيع استخدام نفس النظام لمحو آثاره.

---

## 17. Incident Response Engine

```text
DETECTED → CLASSIFIED → CONTAINED → RECOVERING → VERIFIED → CLOSED
```

`incident/ = detect · classify · contain · preserve · recover · verify`.

---

## 18. Known-Good State

```text
last_known_good_commit · build · config · plugin_set · policy
```

لا إصلاح من حالة فاسدة (IMMUNE PRINCIPLE 009).

---

## 19. Anti-Cascade Protection (Multi-Agent)

```text
max_agent_depth = 5 · max_children = 10 · max_retry = 3
```

+ execution depth · fan-out limit · dependency cycle detection · retry budget · blast-radius limit.

---

## 20. Blast Radius

```ts
interface BlastRadius {
  repositories: string[]; paths: string[]; tools: string[];
  networks: string[]; secrets: string[]; environments: string[];
}
```

قبل التنفيذ: "ما الذي يمكن أن يتلفه هذا الفعل؟" ثم `risk × blast radius` — إذا صار عاليًا → **Approval required**.

---

## 21. Safe Mode & Disaster Mode

```bash
celia safe-mode      # read-only · no external network · no deployments · no secrets · no plugin install · no writes
celia emergency-lock # STOP شامل + ledger preservation + evidence capture + credential revocation + runner isolation
```

الخروج من emergency-lock يتطلب صلاحية مستقلة.

---

## 22. تعلم محدود (بلا مناعة ذاتية مفتوحة)

```text
AI proposes rule → Policy validator → Human/system approval → Rule activation
```

**ممنوع:** `AI detects pattern → AI changes security policy`.

---

## 23. Health & Metrics

```text
GET /system/health
```

```json
{
  "status": "degraded",
  "kernel": "healthy",
  "immune": "watch",
  "ledger": "healthy",
  "storage": "healthy",
  "runners": { "healthy": 3, "quarantined": 1 },
  "incidents": 2
}
```

مقاييس: `MTTD · MTTC · MTTR · Incident Count · False Positive Rate · Policy Violations · Quarantine Count · Recovery Success · Integrity Failures · Credential Revocations`.

---

## 24. سيناريوهات الاختبار الملزمة

| السيناريو | النتيجة |
|---|---|
| prompt injection | block |
| privilege escalation | block |
| runaway loop | kill |
| tampered artifact | quarantine |
| dependency anomaly (severe) | release block |
| crash | restore → verify |

كلها اختبارات فعلية في `kernel/immune/src/index.test.ts`.

---

## 25. التوجيه المعماري

```text
                         USER
                          ▼
                    CONTROL PLANE
                          ▼
                 ┌─ IMMUNE GATE ─┐
                 └───────┬───────┘
                         ▼
                   ATOMIC KERNEL
                         ▼
                 ┌─ IMMUNE RUNTIME ─┐
                 └───────┬─────────┘
                         ▼
       Agents · Tools · Models · Runner · Plugins
                         ▼
                   EXTERNAL WORLD
```

- **Immune Gate** = Detect → Decide (خالص، بلا أثر جانبي).
- **Immune Runtime** = Isolate → Recover → Verify (التطبيق + الدليل + التعافي).
- **Fail-Closed:** حتى لو تعطّل جهاز المناعة، القرار الافتراضي `deny` للعمليات الحساسة.
- **Layer rule:** `contracts ← kernel ← immune ← runtime ← plugins ← adapters`. الـPlugins والـAdapters **ممنوع** أن تعتمد على `@aok/immune` مباشرة — لا تستطيع تجاوز الـGate (مفروض باختبار معماري).
- **قابلية الملاحظة:** `healthSnapshot()` + `MetricsCollector` (IMMUNE PRINCIPLE 012).
