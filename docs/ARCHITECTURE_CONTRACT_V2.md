# ARCHITECTURE CONTRACT v2 — Atomic Kernel Contract

> القانون التنفيذي للدستور ([`KERNEL_CONSTITUTION.md`](KERNEL_CONSTITUTION.md)).
> هنا العقود الفعلية (interfaces) + قواعد التبعية + اختباراتها، بلا فلسفة زائدة.

| البند | القيمة |
|---|---|
| **الإصدار** | `v2.0.0-draft` |
| **الحالة** | `IMPLEMENTING` |
| **المرجع الأعلى** | `KERNEL_CONSTITUTION.md` |
| **الموقع** | `kernel/*` / `runtime/*` / `plugins/*` / `adapters/*` / `tests/architecture/*` |

---

## 1. البدائيات (في `kernel/contracts/src/primitives.ts`)

```ts
interface Entity     { id: ID; type: string; version: number }
interface Event      { id: ID; type: string; entityId: ID; actorId: ID; timestamp: number; payload: unknown }
interface Capability { id: ID; action: string; scope: string; constraints: Constraint[] }
interface Result     { status: 'success'|'failure'; output: unknown; evidence: EvidenceRef[] }
```

الـKernel **ontology-neutral**: لا أنواع Task/Agent/Tool خاصة — الكل `Entity` بنوعه (`entity:task`, `entity:agent`, …).

---

## 2. التنفيذ الموحّد (في `kernel/execution`)

```ts
interface ExecutionContext {
  runId: ID; actorId: ID; parentId?: ID;
  capabilities: CapabilitySpec[];
  workspace: Workspace;
  policy: PolicyContext;
  emit(event: Omit<Event,'id'|'timestamp'>): Promise<Event>; // RULE 004
  require(capability: string): void;                          // RULE 003
  verify(input: unknown): Promise<Verification>;
}

interface CapabilityExecutor {               // Tool = Capability + Adapter
  canExecute(ctx: ExecutionContext): Promise<boolean>;
  execute(input: unknown, ctx: ExecutionContext): Promise<Result>;
}

async function execute(action, input, ctx, registry): Promise<Result>
// مسار: policy → event(requested) → canExecute → تنفيذ → event(completed|denied) → Result
```

---

## 3. شبكة العقود (Contract Mesh)

| العقد | الواجهة | الموقع |
|---|---|---|
| AgentContract | `{ id, version, capabilities, permissions, inputSchema, outputSchema, execute }` | `kernel/contracts/src/agent.ts` |
| ToolContract | `{ id, version, inputSchema, outputSchema, permissions, sideEffects, networkPolicy, timeoutMs }` | `kernel/contracts/src/tool.ts` |
| ModelProvider | `{ id, models, invoke, stream }` + `ModelInfo` | `kernel/contracts/src/model.ts` |
| PolicyContext | `{ evaluate(action, scope) → { allowed, approvalRequired, reason } }` | `kernel/execution` |
| MemoryStore / KnowledgeStore | `{ put, query }` / `{ ingest, search, getSource }` | `kernel/contracts` + `plugins/memory` |
| VaultAdapter | `{ resolve(ref, principal) → ShortLivedCredential }` | `adapters/vault` |
| SandboxManager | `{ allocate(limits), release(id) }` | `runtime/sandbox` |
| EventStore | `{ append(events), all() }` + `Projection{fold}` | `kernel/events` |
| VerificationEngine | `{ verify(target, checks) → Verification }` | `plugins/verification` |
| CapabilityExecutor | `{ canExecute, execute }` | `kernel/execution` |

النواة تتعامل مع **interfaces فقط**؛ Gemini/OpenAI/Anthropic/Local كلها متساوية أمامها.

---

## 4. الـAgent = Composition (بيان وليس Class بذكاء)

```text
Agent =
  Policy + Model + Memory + Planner + Capabilities + Runtime
```

```ts
// الـAgent يُبنى بتركيب قدرات، لا بكتابة Kernel code:
compose('software-engineer', [
  spec('repo.read'), spec('repo.write'), spec('git.commit'),
  spec('github.pull_request.create'), spec('test.run'),
])
```

---

## 5. الانشطار الرسمي: Capability Composition (في `kernel/capability`)

```text
repo.read + repo.write + git.commit + github.pull_request + test.run
   → SoftwareEngineer
   + deploy.staging + browser.verify
   → ReleaseEngineer
Research + Coding + Browser + Verification
   → AutonomousProjectAgent
```

**دون تعديل Kernel.** المستويات:

```text
Kernel → Primitives → Capabilities → Compositions → Agents → Workflows → Organizations → Autonomous Systems
```

---

## 6. الحالة = Projection (في `kernel/events`)

```text
Event Store → Reducers → Current State
```

```ts
class Projection<S> { constructor(reducer, initial) {}; fold(events: Event[]): S }
// runReducer/taskReducer أمثلة: الحالة تُعاد بناؤها من الأحداث (Determinism + Replay).
```

**الـLedger هو الحقيقة** (append-only + سلسلة تجزئة)؛ **Memory وKnowledge مجرد projections** قابلة لإعادة البناء.

---

## 7. اتجاه التبعية (مفروض بالكود)

```text
Contracts ← Kernel ← Runtime ← Plugins ← Adapters
```

| الطبقة | الحزم | التبعيات المسموحة (@aok) |
|---|---|---|
| contracts | `kernel/contracts` | — |
| kernel | `kernel/execution` `kernel/capability` `kernel/policy` `kernel/transition` `kernel/events` | `contracts` فقط |
| runtime | `runtime/scheduler` `runtime/sandbox` | `contracts`, `kernel` |
| plugins | `plugins/agents` `plugins/tools` `plugins/models` `plugins/memory` `plugins/verification` | `contracts`, `kernel`, `runtime` |
| adapters | `adapters/vault` | `contracts` |

**ممنوع:** `kernel → agents`, `kernel → github`, `kernel → Gemini`, `agent يعدّل ledger مباشرة`, `tool يتجاوز policy`, `model يلمس filesystem`.

تُفرض عبر `tests/architecture/`:

```ts
expect(kernel).not.toImport('@aok/agents');      // RULE 001/002
expect(kernel).not.toImport('@aok/models');
expect(tool).mustUse('Capability');               // RULE 003
expect(execution).mustEmit('Event');              // RULE 004
expect(ledger).to.beAppendOnly();                 // RULE 008
```

---

## 8. خريطة الحزم (المستودع الفعلي)

```text
kernel/
  contracts/    @aok/contracts     البدائيات + كل العقود
  execution/    @aok/execution     execute() + ExecutionContext + CapabilityExecutor
  capability/   @aok/capability    Capability Composition
  policy/       @aok/policy        Policy Engine (deny-precedence + approval)
  transition/   @aok/transition    آلات الحالة ككود + الـDAG
  events/       @aok/events        Ledger append-only + EventStore + Projections
runtime/
  scheduler/    @aok/scheduler     جدولة داخل العملية
  sandbox/      @aok/sandbox       Sandbox Manager
plugins/
  agents/       @aok/agents        Agent Registry (Plugin)
  tools/        @aok/tools         Tool Registry + Shell مقيّد
  models/       @aok/models        Model Router
  memory/       @aok/memory        Memory + Knowledge (منفصلان)
  verification/ @aok/verification  Verification Engine
adapters/
  vault/        @aok/vault         Vault (SecretRef → credential)
tests/
  architecture/ @aok/architecture-tests   فرض قوانين الدستور بالكود
apps/  storage/  (قادم: api / cli / console · postgres / event-store / object-store)
```

---

## 9. الحالة الحالية

| المكوّن | الحالة |
|---|---|
| البدائيات الأربعة + ontology-neutral | ✅ منفّذ |
| `execute(action, context)` + CapabilityExecutor | ✅ منفّذ + اختبارات |
| Capability Composition | ✅ منفّذ + اختبارات |
| Projections (state=replay) + EventStore | ✅ منفّذ + اختبارات |
| Architecture Tests (قوانين الدستور) | ✅ منفّذ |
| Adapters (github / mcp / databases / cloud) | ⏳ قادم |
| Storage (postgres / event-store / object-store) | ⏳ قادم |
| Apps (api / cli `celia` / console) | ⏳ قادم |
| الـVertical Slice end-to-end | ⏳ قادم |

*معيار القبول النهائي: قائمة الأسئلة السبعة في الدستور كلها = "نعم".*
