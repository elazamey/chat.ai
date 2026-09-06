# الدستور الهندسي — Agent Operating Kernel (AOK)

> **هذا المستند هو الدستور، وليس وثيقة تصميم.** هدفه منع القرارات قصيرة الأجل التي تقتل المنتج لاحقًا.
> أي مخالفة له تُعتبر انحرافًا معماريًا يجب تبريره في ADR جديد قبل التنفيذ.

- **المصدر المرجعي التفصيلي:** [`ARCHITECTURE_CONTRACT_V1.md`](../../ARCHITECTURE_CONTRACT_V1.md)
- **سجل القرارات (ADRs):** [`ADRs/`](./ADRs/)

---

## المبدأ الحاكم

> **الـKernel يجب أن يكون صغيرًا، حتميًا، قابلًا للتدقيق، ولا يثق بالـLLM؛ والذكاء نفسه يجب أن يكون Plugin فوقه.**

هذا يجعل المشروع قابلًا للتوسع من Agent واحد إلى منظومة Agents دون إعادة كتابة الأساس.

المنتج الحقيقي ليس Chat، بل:

```text
Intent → Task → Plan → Policy → Execution → Evidence → Verification → Outcome → Audit
```

---

## القرارات (مرتّبة حسب الأولوية الهندسية)

### C1 — TypeScript أولًا (اللغة الأساسية)

- النواة، الـControl Plane، العقود، والـCLI: **TypeScript + Node.js**.
- العقود: **Zod** (المصدر) ← **JSON Schema** ← **OpenAPI** (الاشتقاق).
- الاختبارات: **Vitest**. مدير الحزم: **pnpm** (workspace).
- **Python** غير ممنوع؛ يُستخدم كـ Agent/Tool Runtime اختياري عندما تكون مكتبات AI/Data Science أفضل فيه.

السبب: كثافة `Task → Plan → Node → Tool → Job → Approval → Evidence → Verification` تتطلب عقودًا Typed صارمة.

### C2 — النواة ليست Agent

التركيب:

```text
User → Control Plane → Agent Runtime → Kernel → { Tools, Models, Sandboxes }
```

الـKernel لا يعرف Claude ولا Gemini ولا GPT ولا Manus ولا أي Agent متخصص — **يعرف Contracts فقط**. تغيير المزوّد أو إضافة Agent يصبح رخيصًا.

### C3 — الـAgent هو Plugin

```ts
interface AgentContract {
  id: string; version: string;
  capabilities: Capability[];
  input: Schema; output: Schema;
  permissions: Capability[];
  execute(ctx: AgentContext): Promise<AgentResult>;
}
```

الـKernel **لا يثق بالـAgent تلقائيًا**. إضافة Agent = تسجيل Plugin، بلا تعديل على النواة.

### C4 — أمان قائم على الـCapabilities (وليس Role-Based فقط)

ممنوع `admin = true`. القدرات:

```text
repo.read  repo.write  git.commit  git.push  shell.execute  network.http
secret.read  deployment.create  browser.navigate  fs.read  fs.write  db.query
```

الـPolicy Engine يجيب: **Who? What? Where? Why? When? Under which approval?** و`deny` له الأسبقية دائمًا.

### C5 — كل عملية تصبح Event

`TaskCreated → PlanGenerated → NodeStarted → ToolRequested → ApprovalRequired → ApprovalGranted → ToolExecuted → ArtifactCreated → CommitCreated → DeploymentStarted → VerificationStarted → VerificationPassed → TaskCompleted`

الـLedger ليس Logs — هو **مصدر الحقيقة للنظام**.

### C6 — الـLedger Append-Only مع سلسلة تجزئة

لا يوجد update/delete، فقط `append(event)`. وكل حدث مربوط بسابقه:

```text
event_n.hash = hash(payload_n + event_(n-1).hash)
```

→ سلسلة قابلة لكشف العبث. (التطوير لاحقًا: Merkle Tree + Signed Evidence.)

### C7 — "تم بنجاح" ممنوع

الـKernel لا يصدّق قول الـAgent. المسار الإلزامي:

```text
EXECUTION → RESULT → EVIDENCE → VERIFICATION → ACCEPTED
```

"Deploy application" لا تعني "نجح الأمر" بل: URL reachable + healthcheck=200 + version matches commit + logs clean + migration verified ← ثم `Verification = PASSED`.

### C8 — الـVerification خدمة من الدرجة الأولى

ليس helper. النظام يقول "أنا **أثبتُ** أنني نفذت" وليس "أنا نفذت":

```text
Claim → Evidence → Verification { PENDING | PASSED | FAILED | UNKNOWN }
```

قاعدة صارمة: **لا `PASSED` بدون دليل (Evidence).**

### C9 — الـSandbox من اليوم الأول

كل execution يمر عبر **Sandbox Manager** بحدود: filesystem / CPU / RAM / timeout / process limit / network policy / workspace boundary / secret policy.

مناطق الثقة المنفصلة: `Control Plane` / `Kernel` / `Sandbox` / `Vault`.

### C10 — الأسرار خارج الـKernel

لا `process.env.OPENAI_KEY` مبعثرة. المسار:

```text
SecretRef → Vault → Short-lived credential → Tool
```

الـKernel يعرف **مرجع السر فقط**، ولا يعرف القيمة إلا عند الضرورة القصوى. (بداية: Vault adapter بسيط؛ لاحقًا: 1Password / AWS KMS / HashiCorp Vault.)

### C11 — الفصل بين Task / Run / Node / Job / ToolExecution

```text
Task            (ما يريد المستخدم)
 └── Run        (محاولة تنفيذ)
      ├── Node        (خطوة في الخطة)
      │    └── Job          (وحدة تشغيل)
      │         └── ToolExecution (تنفيذ فعلي)
      └── Verification
```

### C12 — آلات الحالة كـSource Code (وليس توثيقًا فقط)

```ts
transition(current, event) → next | throws IllegalTransitionError
```

ويمنع مثلًا `PLANNED → COMPLETED` مباشرة (الانتقال غير القانوني يرمي خطأ).

```text
PLANNED → RUNNING → WAITING_APPROVAL → RUNNING → VERIFYING → COMPLETED
```

### C13 — الموافقة البشرية Policy-driven وليست Global

```text
read file           → auto
edit local file     → auto
commit              → policy (مسموح ضمن allowlist + تدقيق كامل)
push                → approval
delete repository   → approval
production deploy   → approval
secret access       → approval
```

### C14 — الـTool Registry أهم من الـAgent Registry

القدرة الحقيقية تأتي من الأدوات. العقد:

```ts
interface ToolContract {
  id; version; description;
  inputSchema: ZodSchema; outputSchema: ZodSchema;
  permissions: Capability[];
  sideEffects: SideEffect[];
  networkPolicy: NetworkPolicy;
  timeoutMs: number;
}
```

### C15 — لا يوجد "Shell Tool" مفتوح

بدل `shell(command)` مفتوح: أدوات متخصصة (`git`, `npm`, `python`, `filesystem`, `docker`, `browser`, `github`, `cloudflare`). وأي `shell.exec` يُقيَّد بـ: allowlist + timeout + cwd + env allowlist + network policy + حدود stdout/stderr.

### C16 — الـModel Router مستقل

النظام ليس "Anthropic system" ولا "OpenAI system". مزوّدون: Gemini / OpenAI / Anthropic / local / future. والـRouter يختار حسب: task type + cost + latency + context + tool calling + reasoning requirement + availability.

### C17 — النموذج لا يقرر السلطة

الـLLM يقترح (propose/plan/reason/generate) فقط. **لا يستطيع**: grant permission / approve itself / modify ledger / read secret / bypass policy. الـLLM = اقتراحات، والـKernel = القرار.

### C18 — الذاكرة ليست قاعدة بيانات واحدة

```text
Working / Task / Session / Project / User / Long-Term / Knowledge
```

"تفضيل المستخدم" ≠ "سياق المهمة" ≠ "معرفة المستودع".

### C19 — الـRAG مستقل عن الـMemory

`Memory` = حالة وخبرة. `Knowledge` = معلومات قابلة للاسترجاع. الخدمات: Memory Service / Knowledge Service / Embedding Provider / Vector Store / Retrieval Engine — بحيث يمكن تغيير Vector DB دون تغيير الـKernel.

### C20 — MCP هو Adapter وليس القلب

```text
Internal Tool Contract ↔ MCP Adapter ↔ External MCP Server
```

### C21 — Monorepo صغير (وليس 40 خدمة من البداية)

```text
/apps       control-plane · cli · api
/packages   contracts · kernel · policy · ledger · scheduler
            tools · agents · models · memory · verification · sandbox · security
/docs       architecture · ADRs
```

الانفصال لخدمات منفصلة فقط عند وجود حاجة فعلية.

### C22 — قاعدة البيانات: PostgreSQL

PostgreSQL للإنتاج من البداية (transactions / concurrency / JSONB / indexes / advisory locks / event persistence). SQLite للـ local/dev/test فقط.

### C23 — Redis ليس إلزاميًا في MVP

البداية: Postgres + in-process scheduler. ثم Redis (queues/cache/pub-sub) عند الحاجة الفعلية.

### C24 — API-first

كل شيء له عقد (OpenAPI + JSON Schema + Zod). الـCLI نفسه يستخدم الـAPI. كل الواجهات (CLI/Web/SDK/Agent خارجي) تتحدث إلى نفس الـControl Plane.

### C25 — الـCLI واجهة من الدرجة الأولى

```bash
celia task create      celia task run       celia task inspect
celia run replay       celia ledger show    celia approval approve
celia tools list       celia models list    celia verify
celia evidence export
```

---

## ترتيب التنفيذ (ملزم)

```text
1.  Kernel Contract           ← packages/contracts + packages/kernel
2.  Security Model            ← packages/policy + packages/security
3.  Event/Ledger Model        ← packages/ledger
4.  State Machines            ← packages/kernel
5.  Tool Contract             ← packages/tools
6.  Verification Contract     ← packages/verification
7.  Sandbox Contract          ← packages/sandbox
8.  Model Router              ← packages/models
9.  Agent Plugin Contract     ← packages/agents
10. Memory/Knowledge          ← packages/memory
11. APIs                      ← apps/api
12. UI                        ← apps/control-plane + apps/cli
```

أكبر خطأ ممكن الآن: بناء Dashboard جميلة قبل اكتشاف الـKernel والـSecurity والـVerification.

---

## الـVertical Slice (معيار النجاح الفعلي)

لا نبدأ بـM0 "هيكلة مجلدات". نبني أول **Vertical Slice end-to-end**:

```text
User → Create Task → Planner → Approval → GitHub Tool → Sandbox
     → Ledger → Verification → Evidence → Completed
```

السيناريو:

> **"خذ repository، حلّ مشكلة محددة، أنشئ commit، افتح PR، ثم أثبت بالأدلة أن الـtests نجحت وأن الـPR يحتوي التغيير المطلوب."**

إذا نجح هذا end-to-end ← لدينا نواة حقيقية. الـAgents/الـMemory/الـRAG/الـMarketplace توسعات فوقها.
