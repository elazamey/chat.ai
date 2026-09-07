# ZERO_COST_ECONOMIC_CONTRACT v1 — العقد الاقتصادي الصفري

> **Zero-Cost-to-Build + Zero-Cost-to-Deploy + Monetizable-by-Design**
> ليس "مجاني = الاعتماد على خدمات مجانية"، بل: **تشغيل النواة محليًا بالكامل، ونشر MVP مجانًا، ثم تحويل نفس البنية إلى منتج يدرّ المال دون إعادة هندسة.**
> القيد الحاكم (من [`KERNEL_CONSTITUTION.md`](KERNEL_CONSTITUTION.md)): المبادئ الاقتصادية العشرة.

---

## 1. القرار الاقتصادي رقم صفر

**النواة لا تعتمد على خدمة مدفوعة كي تعمل:**

```text
Core execution   → local        Policy   → local
Ledger           → local        Verification → local
Agent runtime    → local        Tool contracts → local
Storage abstraction → pluggable   Model abstraction → pluggable
```

```bash
npm install && npm run dev   # بدون Stripe/AWS/GCP/Azure/OpenAI/سيرفر مدفوع
```

---

## 2. النموذج النهائي

```text
                 ATOMIC KERNEL
                      │
       ┌──────────────┼──────────────┐
       │              │              │
    Local          Free           Paid
    Runtime       Hosted         Premium
       │              │              │
       └──────────────┼──────────────┘
                      │
                 SAME KERNEL
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
   Open Source      SaaS           Enterprise
      │               │                │
      ▼               ▼                ▼
    Free          Subscription      Support
```

**النسخة المجانية والمدفوعة ليستا مشروعين مختلفين. النواة واحدة.**

---

## 3. Free Forever Core (قناة التوزيع)

```text
Atomic Kernel + CLI + Local Runtime + Basic Agents + Basic Tools
+ Local Memory + Local Ledger + Basic Verification
→ Open Source / Free Forever
```

كل مستخدم مجاني هو محتمل أن يصبح: `Cloud customer / Enterprise / Marketplace buyer / Support / Integration customer`.

---

## 4. الربح ليس من النواة

لا نبيع `Kernel = $20` — نبيع ما حولها:

| الطبقة | القناة |
|---|---|
| **Managed Cloud** | اشتراك شهري (Free $0 / Pro / Power / Team / Enterprise Custom — أسعار استراتيجية لاحقًا) |
| **Execution credits** | تشغيل مُدار بالـcredits |
| **Premium integrations** | ربطات مدارة |
| **Marketplace** | عمولة (نموذجيًا 10–20% — تُحدَّد لاحقًا) |
| **Enterprise** | عقود (SSO/RBAC/Audit/Policy/Governance/Compliance) |
| **Support / Consulting** | خدمات |

---

## 5. Stack المجاني للـMVP (بلا تكلفة استضافة)

```text
Frontend        → Cloudflare Pages     (500 build/شهر مجانًا حاليًا)
Edge API        → Cloudflare Workers   (100,000 طلب/يوم مجانًا حاليًا)
CI              → GitHub Actions       (مجانية للـpublic repos؛ 2,000 دقيقة/شهر للمستودعات الخاصة)
Database        → Supabase Free        (PostgreSQL ~500MB؛ يوقف المشاريع بعد أسبوع من الخمول)
Local dev       → جهازك
```

> الحدود المذكورة تتغير بمرور الوقت، ويجب إعادة التحقق منها قبل الاعتماد ([Cloudflare Docs](https://developers.cloudflare.com/workers/platform/limits/) — [GitHub Docs](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).

**قاعدة معمارية مهمة:** لا نضع الـAgent execution الثقيل داخل Worker (حدود CPU/طلبات). نضع فقط الـcontrol/API/UI.

---

## 6. فصل Control Plane عن Execution Plane

```text
              CONTROL PLANE            Cloudflare / API / Dashboard
                    │
              Execution Queue
                    │
              EXECUTION PLANE           Local / Worker / Runner
                    │
            ┌───────┼───────┐
            ▼       ▼       ▼
          Agent   Tool    Sandbox
```

**Cloud Control Plane + Local Execution Agent** — بفلسفة GitHub Actions runners.

---

## 7. الـRunner منتج بذاته

```bash
celia runner install
celia runner connect
celia runner start
```

```text
Celia Cloud → Task → Your Runner → { filesystem, git, Docker, browser, local models }
```

**أنت لا تدفع compute المستخدم — المستخدم ينفّذ على جهازه.** والـRunner مفتوح المصدر؛ تُباع: control plane + team mgmt + central memory + governance + observability + marketplace.

---

## 8. لا نبيع Tokens — BYOK

الربح الأساسي **ليس** `$0.01/token`. مصادر الذكاء:

```text
User API Key (BYOK) · Free model · Local model · Managed provider
```

- **BYOK** من اليوم الأول: Gemini/OpenAI/Anthropic/OpenRouter/local endpoint.
- الخطة المدفوعة توفر **Managed Models** باشتراك أو credits.

---

## 9. Cost Guard داخل النواة

```ts
interface BudgetPolicy {
  maxExecutionSeconds: number;
  maxToolCalls: number;
  maxModelCalls: number;
  maxNetworkRequests: number;
  maxTokens?: number;
  maxRuns?: number;
  maxEstimatedCost?: number;
}
```

```text
Free User → 10 runs/day · 100 tool calls/day · 20 model calls/day · 0 managed AI credits
```

ليس حماية للمستخدم فقط — **حماية لهامش الربح**. (مطبَّق في `kernel/economics`.)

---

## 10. Cost-aware Model Router

```text
Task → Router → Local model? YES → Free API? YES → Cheap model? YES → Premium? only if justified
```

لا نموذج غالي لمهمة ينفّذها نموذج مجاني. (MockProvider = $0 للـCI.)

---

## 11. Marketplace + Plugin قابل للربح

```text
Agent · Tool · Workflow · Connector · Policy pack · Verification pack · Memory pack · Prompt pack
→ Celia Marketplace (عمولة)
→ @user/github-release-agent · @user/seo-agent · @user/arabic-content-agent
→ Free / Paid / Private / Enterprise
```

---

## 12. Enterprise (المرحلة عالية الهامش)

```text
SSO · RBAC · Audit · Policy · Private Registry · Self-hosting · Air-gapped
Compliance · Centralized runners · Governance · Evidence retention · Security controls
```

وهي بالضبط نقاط قوة النواة أصلًا (Ledger + Verification + Policy).

---

## 13. Open Core بدون خسارة OSS

```text
Free:   Core + Runner + CLI + Basic Agents + Basic Tools
Paid:   Enterprise Control + Central Policy + Advanced Governance + Premium Support
```

---

## 14. Economic Kernel (الاقتصاد في المعمارية)

```text
Kernel
├── Execution
├── Security
├── Verification
├── Ledger
└── Economics      ← metering + quota (القياس وتطبيق الحدود)
```

```ts
interface UsageMeter { record(event: UsageEvent): void; usage(): Usage }
interface QuotaPolicy { allows(usage: Usage, inc: Increment): { allowed: boolean; reason: string } }
interface BillingAdapter { report(usage: Usage): Promise<void> }
```

**Billing لا يكون داخل الـKernel.** النواة **تقيس وتطبّق الحدود فقط**؛ Stripe/PayPal adapters خارجية تُضاف عند وجود إيراد، لا قبله.

| المكوّن | الموقع |
|---|---|
| `BudgetPolicy` / `QuotaPolicy` / `UsageMeter` / `BillingAdapter` (عقود) | `kernel/contracts` |
| `BudgetQuota` + `InMemoryUsageMeter` (تطبيق) | `kernel/economics` |
| `NoopBillingAdapter` / `InMemoryBillingAdapter` | `adapters/billing` |

---

## 15. Profit Boundary

```text
════════════════ FREE ZONE ════════════════
Kernel · CLI · Runner · OSS · Local · Basic Tools · Basic Agents
════════════════ VALUE ZONE ═══════════════
Cloud Control · Hosted Execution · Premium Models · Central Memory
Marketplace · Enterprise · Support
```

المستخدم يشغّل النظام بلا دفع؛ وعندما يريد **الراحة + القوة + الإدارة + التوسع** يدفع.

---

## 16. المسار إلى أول دولار دون دفع دولار

```text
$0 → Open Source → GitHub Users → Free Cloud → Local Runner
   → Users + Projects → { SaaS | Marketplace | Enterprise } → $$$
```

---

## 17. القيد الواقعي (مُثبَّت في الدستور)

لن نعد بأن الإنتاج واسع النطاق يبقى مجانيًا للأبد (inference/persistent compute/sandboxing/storage نموّها يكلف).
الهدف الصحيح:

> **صفر تكلفة منك حتى أول مستخدمين وأول إيراد، ثم كل زيادة تكلفة مرتبطة بزيادة إيراد.**

---

## 18. الحالة الحالية

| المكوّن | الحالة |
|---|---|
| المبادئ الاقتصادية العشرة (في الدستور) | ✅ |
| `BudgetPolicy` + `QuotaPolicy` + `UsageMeter` + `BillingAdapter` | ✅ منفّذ + اختبارات |
| `BudgetQuota` + `InMemoryUsageMeter` (kernel/economics) | ✅ منفّذ + اختبارات |
| `NoopBillingAdapter` (adapters/billing — خارج النواة) | ✅ منفّذ + اختبارات |
| BYOK (ProviderCredentials = SecretRef وليس مفتاحًا خامًا) | ✅ منفّذ |
| MockProvider (نموذج $0 حتمي للـCI/التطوير) | ✅ منفّذ + اختبارات |
| Local Runner (`CELIA_MODE=local|cloud`) + أول Vertical Slice محلي بـ$0 | ✅ منفّذ + اختبارات |
| Deploy على الطبقة المجانية (Workers/Pages) | ⏳ قادم |
| Marketplace / Managed Cloud / Enterprise | ⏳ قادم |

*كل مبدأ اقتصادي هنا له مقابل في كود أو Architecture Test.*
