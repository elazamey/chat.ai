# chat.ai — Agent Operating Kernel (AOK)

نظام تشغيل للوكلاء (Agent Operating System) ينافس Manus وClaude Code.
**نواة ذرية انشطارية**: عدد قليل من الـprimitives يولّد النظام كله، والنواة ontology-neutral لا تعرف Agent ولا Tool ولا Model.

```text
Intent → Task → Plan → Policy → Execution → Evidence → Verification → Outcome → Audit
```

## الوثائق المرجعية (التسلسل الهرمي)

- 📜 **[KERNEL_CONSTITUTION.md](docs/KERNEL_CONSTITUTION.md)** — دستور النواة (القواعد العشر + المبادئ الاقتصادية العشرة + معيار النجاح).
- 📄 **[ATOMIC_KERNEL_CONTRACT.md](docs/ATOMIC_KERNEL_CONTRACT.md)** — عقد النواة الذرية (interfaces + قواعد التبعية).
- 💰 **[ZERO_COST_ECONOMIC_CONTRACT.md](docs/ZERO_COST_ECONOMIC_CONTRACT.md)** — العقد الاقتصادي (Free Core + BYOK + Runner + Metering/Quota).
- 📄 **[ARCHITECTURE_CONTRACT_V1.md](docs/ARCHITECTURE_CONTRACT_V1.md)** — عقد النظام الشامل (العقود/APIs/آلات الحالة).
- 🗂️ **[سجل القرارات المعمارية (ADRs)](docs/architecture/ADRs/)** — كل قرار بسياقه ونتائجه.

## البدائيات الأربعة

```ts
Entity · Event · Capability · Result
```

منها تتولد بقية النظام. والـKernel يهتم فقط: **هل يستطيع الفاعل؟ ما السياسة؟ ماذا حدث؟ ما الدليل؟ هل تحقق؟**

## القواعد العشر (مفروضة بالكود)

1. النواة **لا تعرف** Agents. 2. النواة **لا تعتمد** على Model Provider.
3. لا تنفيذ مميز بدون Capability. 4. كل أثر جانبي → Event.
5. كل إنجاز خارجي → قابل للتحقق. 6. الـPlugins لا تعدّل حالة النواة.
7. الأسرار خارج حالة التطبيق. 8. الحالة قابلة لإعادة البناء من الأحداث.
9. لا مكوّن يمنح نفسه صلاحية. 10. كل حدود قدرة صريحة.

تُفرض عبر **Architecture Tests** في `tests/architecture/` — كسر القانون يفشل في CI.

## البنية (Monorepo)

```text
kernel/     contracts · execution · capability · policy · transition · events · economics
runtime/    scheduler · sandbox
plugins/    agents · tools · models · memory · verification
adapters/   vault · billing
apps/       cli (celia + LocalRunner)
tests/      architecture      (فرض قوانين الدستور بالكود)
storage/    (قادم: postgres · event-store · object-store)
```

| المكوّن | الحزمة |
|---|---|
| البدائيات + العقود | `@aok/contracts` |
| التنفيذ الموحّد `execute()` | `@aok/execution` |
| التركيب (Composition) | `@aok/capability` |
| السياسة (deny-precedence) | `@aok/policy` |
| آلات الحالة + الـDAG | `@aok/transition` |
| الـLedger + Projections | `@aok/events` |
| الجدولة / الـSandbox | `@aok/scheduler` · `@aok/sandbox` |
| الأدوات / الوكلاء | `@aok/tools` · `@aok/agents` |
| النماذج / الذاكرة / التحقق | `@aok/models` · `@aok/memory` · `@aok/verification` |
| الأسرار | `@aok/vault` |
| الاقتصاد (قياس + حدود) | `@aok/economics` |
| الفوترة (خارج النواة) | `@aok/billing` |
| الـRunner المحلي + CLI | `@aok/cli` |

## التشغيل

```bash
corepack enable            # تفعيل pnpm
pnpm install
pnpm test                  # Vitest (يشمل Architecture Tests)
pnpm typecheck             # tsc --noEmit لكل الحزم
```

## الدفع التلقائي إلى المستودع

كل `commit` يدفع الفرع الحالي إلى `origin` فورًا (hook داخل المستودع):

```bash
bash scripts/setup-hooks.sh   # التفعيل لأي نسخة جديدة
```

## الحالة

`IMPLEMENTING` — النواة الذرية منفّذة (primitives + execute() + projections + composition +
architecture tests) + **الطبقة الاقتصادية** (Quota + Metering + BYOK + MockProvider + LocalRunner
يعمل محليًا بـ$0). التالي وفقًا للدستور: **Adapters (github) → Storage → Deploy على الطبقة المجانية → الـVertical Slice الكامل**.
