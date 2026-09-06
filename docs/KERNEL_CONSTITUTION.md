# KERNEL CONSTITUTION v1 — دستور النواة الذرية

> **هذا هو الدستور: القانون الأعلى.** أصغر وأشد صرامة من أي وثيقة أخرى.
> `ARCHITECTURE_CONTRACT` هو القانون التنفيذي، والـADRs هي سجل القرارات.
> **عند التعارض، هذا الدستور هو الفيصل.**

---

## الفلسفة

قوة النظام لا تأتي من ضخامة الـKernel، بل من أن **عددًا قليلًا جدًا من primitives الأولية يمكنه توليد بقية النظام**.

```text
INTENT → GRAPH → CAPABILITY → EXECUTION → EVENT → EVIDENCE → VERIFICATION
```

ولا شيء في هذا المسار يعرف: GPT / Claude / Gemini / GitHub / Browser / Docker / Postgres / Agent / MCP / Cloudflare. **هذه كلها أجسام تدور حول النواة.**

النموذج المعتمد:

```text
                USER INTENT
                     ↓
               COMPOSITION
                     ↓
         ┌───── ATOMIC KERNEL ─────┐
         │ Identity · Capability    │
         │ Policy · Transition      │
         │ Execution · Event        │
         │ Evidence · Verification  │
         └──────────┬───────────────┘
                    ↓
   Agent · Tool · Model · Sandbox
         ↓          ↓         ↓
   Plugins · Adapters · Providers · Runtime
                    ↓
            EXTERNAL WORLD
```

---

## البدائيات الأربعة

كل شيء تقريبًا يُبنى على أربعة أشياء فقط:

```ts
type ID = string;

interface Entity {
  id: ID; type: string; version: number;
}

interface Event {
  id: ID; type: string; entityId: ID; actorId: ID;
  timestamp: number; payload: unknown;
}

interface Capability {
  id: ID; action: string; scope: string; constraints: Constraint[];
}

interface Result {
  status: "success" | "failure";
  output: unknown;
  evidence: EvidenceRef[];
}
```

من `Entity / Event / Capability / Result` تتولد بقية الأشياء.

---

## القواعد العشر (غير قابلة للتفاوض)

| # | القاعدة |
|---|---|
| **RULE 001** | Kernel **MUST NOT** know Agents. |
| **RULE 002** | Kernel **MUST NOT** depend on a Model Provider. |
| **RULE 003** | No privileged execution **without Capability**. |
| **RULE 004** | Every side effect **MUST** produce an Event. |
| **RULE 005** | Every externally observable completion **MUST** be verifiable. |
| **RULE 006** | Plugins **MUST NOT** mutate Kernel state directly. |
| **RULE 007** | Secrets **MUST NOT** enter ordinary application state. |
| **RULE 008** | State **MUST** be reconstructable from authoritative events. |
| **RULE 009** | No component may **grant itself authority**. |
| **RULE 010** | Every capability boundary **MUST** be explicit. |

---

## قوانين النواة

### النواة Ontology-Neutral

لا تقول النواة `Task / Agent / Tool / Workflow / Job / Memory` — تقول **`Entity`**، والـ`type` هو الذي يحدد الدور:

```text
entity:task  entity:agent  entity:tool  entity:workflow
entity:memory  entity:claim  entity:evidence  entity:run
```

### الفعل نفسه Primitive

لا `runAgent()` / `executeTool()` / `runTask()` — بل **`execute(action, context)`** واحدة:

```ts
execute({ action: "github.pull_request.create", input: { repository: "x/y", title: "Fix auth" } })
```

لا يهم هل المنفّذ `Agent / Tool / Human / Scheduler / نظام آخر` — النواة تهتم فقط:
**هل يستطيع هذا الفاعل تنفيذ هذه القدرة؟ ما السياسة؟ ماذا حدث؟ ما الدليل؟ هل تحقّق؟**

### الـAgent = Composition

```text
Agent = Policy + Model + Memory + Planner + Capabilities + Runtime
```

Agent جديد **دون كتابة Kernel code**.

### الـTool = Capability + Adapter

```text
github.create_pr → MCP Adapter | REST Adapter | CLI Adapter | Local Adapter
```

كلها تحقق نفس العقد `CapabilityExecutor { canExecute, execute }`.

### النواة حتمية (Deterministic Core)

> الـLLM غير حتمي، أما الـKernel فيجب أن يكون حتميًا قدر الإمكان.

- **LLM:** "What should I do?" (يقترح)
- **Kernel:** "Can I allow it? Which transition is legal? Which capability is required? Which evidence is required? Is the result verified?" (يحسم)

### كل شيء يترك أثرًا

`Model selection / Prompt generation / Tool selection / Approval / File write / Network call / Memory write / Policy decision / Verification` — كلها أحداث.

```text
System state = replay(Event[])
```

### الحالة ليست ملك الـAgent

```text
Event Store → Reducers → Current State
```

(Projections: Task / Run / Approval / Ledger / Verification). **الـLedger هو الحقيقة؛ Memory وKnowledge مجرد projections.**

### Proof-Carrying Execution

كل عملية مهمة تحمل: `Intent + Actor + Capability + Action + Result + Evidence + Verification`.

### ضبط الحجم

لو بدأ `kernel.ts` ينتفخ (3000 → 5000 → 10000 سطر) فهذا فشل معماري غالبًا. النواة مقسّمة:

```text
kernel/ identity · execution · transition · capability · event · policy
```

---

## اتجاه التبعية (قانون لا ينعكس)

```text
        OUTER WORLD
             ↓
     adapters/plugins
             ↓
       application
             ↓
         kernel
             ↓
        contracts
```

```text
Contracts ← Kernel ← Runtime ← Plugins ← Integrations
```

**كل طبقة خارجية تعرف الداخل. الداخل لا يعرف الخارج.** مفروض بالكود عبر Architecture Tests.

قاعدة الانشطار:

> **كل Package يجب أن يستطيع الانهيار دون انهيار الـKernel.**

---

## معيار نجاح النواة (القائمة الفاصلة)

| السؤال | الجواب المطلوب |
|---|---|
| إضافة Model provider جديد دون لمس Kernel؟ | **نعم** |
| إضافة Agent جديد دون لمس Kernel؟ | **نعم** |
| استبدال PostgreSQL → storage آخر دون تغيير Execution semantics؟ | **نعم** |
| استبدال GitHub → GitLab دون تغيير Agent contract؟ | **نعم** |
| تشغيل النظام بدون LLM؟ | **نعم** |
| Replay الـRun من الـLedger؟ | **نعم** |
| إثبات لماذا نُفّذ الـAction؟ | **نعم** |

إن لم نستطع، فالنواة لم تصبح ذرية بعد.

---

## المبادئ الاقتصادية العشرة (Zero-Cost + Monetizable-by-Design)

> التفصيل الكامل: [`ZERO_COST_ECONOMIC_CONTRACT.md`](ZERO_COST_ECONOMIC_CONTRACT.md)

```text
ECONOMIC PRINCIPLE 001
The Kernel MUST operate without a paid external dependency.

ECONOMIC PRINCIPLE 002
Local execution MUST remain a first-class supported mode.

ECONOMIC PRINCIPLE 003
External model providers MUST be replaceable.

ECONOMIC PRINCIPLE 004
Cloud execution MUST NOT be required for core functionality.

ECONOMIC PRINCIPLE 005
Every metered resource MUST have an explicit budget policy.

ECONOMIC PRINCIPLE 006
The free core MUST remain useful, not crippled.

ECONOMIC PRINCIPLE 007
Paid features MUST primarily monetize convenience, scale,
governance, managed infrastructure, and ecosystem value.

ECONOMIC PRINCIPLE 008
No infrastructure component may create unavoidable
vendor lock-in for the Kernel.

ECONOMIC PRINCIPLE 009
The architecture MUST support BYOK and local models.

ECONOMIC PRINCIPLE 010
The product MUST be capable of reaching first revenue
before requiring material infrastructure spend.
```

**حكم الـBilling:** النواة **تقيس وتطبّق الحدود** (`UsageMeter` + `QuotaPolicy` في `kernel/economics`)؛
بينما `BillingAdapter` (Stripe/PayPal/…) **خارج النواة** (`adapters/billing`) وتُضاف عند وجود إيراد.

---

## التسلسل الهرمي للوثائق

```text
KERNEL_CONSTITUTION.md          (هذا — القانون الأعلى: القواعد العشر + المبادئ الاقتصادية العشرة)
        ↓
ATOMIC_KERNEL_CONTRACT.md       (عقد النواة الذرية — القانون التنفيذي)
        ↓
ZERO_COST_ECONOMIC_CONTRACT.md  (العقد الاقتصادي الصفري)
        ↓
ARCHITECTURE_CONTRACT_V1.md     (عقد النظام الشامل — مرجع العقود/APIs)
        ↓
ADRs + architecture/CONSTITUTION.md (سجل القرارات)
```

*كل قاعدة هنا لها اختبار معماري في `tests/architecture/`.*
