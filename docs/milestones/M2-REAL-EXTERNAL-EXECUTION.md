# M2 — REAL EXTERNAL EXECUTION

> اختبار النواة الحقيقي: عبور الحدود إلى العالم الخارجي (GitHub) دون أن تتحول النواة إلى وحش مركزي.

| البند | القيمة |
|---|---|
| **الحالة** | `IN_PROGRESS` |
| **ما قبله** | M0 Atomic Core · M1 Local Execution |
| **ما بعده** | M3 Persistent Event Store · M4 Free Deployment · M5 Real E2E + CI · M6 Monetization |

## معيار القبول (Definition of Done)

```text
ZERO kernel changes for GitHub integration   ✅ (Architecture Test: kernel لا يذكر github)
ZERO raw secrets in kernel                   ✅ (SecretRef → Vault → credential)
ZERO direct agent→GitHub calls               ✅ (execute() → Policy → Adapter → API)
100% side effects ledgered                   ✅ (كل خطوة Event في الـLedger)
100% privileged actions policy-checked       ✅ (PolicyEngine قبل كل execute)
100% completion claims verified              ✅ (Claim → Evidence → Verification)
E2E against a real repository                ✅ (PR حقيقي على elazamey/chat.ai)
Evidence export succeeds                     ✅ (.e2e-artifacts/evidence-*.json)
Replay succeeds                              ✅ (Ledger replay + verifyIntegrity)
Quota enforcement succeeds                   ✅ (BudgetQuota قبل كل أداة)
```

## المسار (كل خطوة في الـLedger)

```text
TaskCreated → PlanGenerated → ApprovalRequired → ApprovalGranted
→ github.repo.read → github.repo.branch.create
→ github.repo.file.read → github.repo.file.write → github.git.commit
→ github.pull_request.create → github.pull_request.read
→ Verification (متعدد الطبقات) → TaskCompleted
```

## التحقق متعدد الطبقات (Execution Success ≠ Verified Success)

```text
PR exists ✅ · correct repository ✅ · correct branch ✅
expected commit ✅ · expected diff ✅ · tests ✅
ledger chain intact ✅ · evidence linked ✅ · verification PASSED ✅
```

## التبعية (مفروضة بالكود)

```text
Kernel → Capability → ToolContract → GitHubAdapter → GitHub API
```

- `plugins/tools/github` (`@aok/github`) — plugin خارجي، يعتمد على `contracts` + `registry` + `execution`.
- `kernel/registry` (`@aok/registry`) — Namespace + Schema Registry (لا `admin.superpower`).
- `kernel/contracts/src/naming.ts` — اتفاقية التسمية (Namespace + Action).

## العمليات السبع (فقط)

```text
github.repo.read · github.repo.branch.create · github.repo.file.read
github.repo.file.write · github.git.commit · github.pull_request.create
github.pull_request.read
```

## كيفية التشغيل

```bash
# اختبارات الوحدة (offline، FakeTransport)
pnpm test

# الـE2E الحقيقي (يتطلب GH_TOKEN + إذنًا صريحًا)
CELIA_E2E_REAL=1 pnpm exec vitest run apps/cli/src/github-e2e.real.test.ts
```

> **ملاحظة بيئية:** إذا كان الـruntime خلف TLS-intercepting proxy، قد يفشل `fetch` في Node
> بخطأ `unable to verify the first certificate`. الحل: تمرير شهادة النظام لـNode:
> `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`. (الـGitHub Adapter نفسه صحيح؛ المشكلة في ثقة شهادة Node، لا في الكود.)

## الدليل الفعلي (تم تنفيذه)

- **PR حقيقي مفتوح:** `elazamey/chat.ai#2` (branch `e2e/m2-*` → `main`).
- **الملف:** `docs/e2e/M2-<ts>.md [added]`.
- **التحقق متعدد الطبقات (من الـevidence المُصدَّر):**
  `PR exists ✅ · correct repository ✅ · correct branch ✅ · expected commit ✅
   expected diff ✅ · tests ✅ · ledger chain intact ✅ → PASSED`.
- **الدليل مُصدَّر:** `.e2e-artifacts/evidence-<runId>.json` (gitignored).
- **Replay + سلسلة التجزئة:** سليمة (verifyIntegrity = valid).
