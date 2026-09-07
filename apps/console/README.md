# @aok/console — Canyou (واجهة مساحة العمل الذكية)

نقطة الدخول الموحّدة لنظام AOK: تجمع **تجربة Manus (Agent Workspace)** مع
**وقت تشغيل Claude Code (Engineering Runtime)** فوق النواة، مع طبقة نماذج متعددة المصادر.

## التشغيل

```bash
pnpm install          # من جذر المستودع
pnpm --filter @aok/console dev
```

افتح `http://localhost:5173` (أو معاينة Arena الحية).

## البنية

```text
apps/console/src
├── main.tsx                 # نقطة الدخول
├── App.tsx                  # التوجيه بين الواجهات + الحالة
├── kernel.ts                # جسر النواة: يستورد @aok/contracts + ModelRouter الحقيقي
├── domain.ts                # نماذج نطاق الواجهة (منفصلة عن عقد النواة)
├── mock.ts                  # محاكي تنفيذ تجريبي (يُستبدل بالـOrchestrator الحقيقي)
└── components/
    ├── Sidebar.tsx          # التنقل + شارة المهام
    ├── Topbar.tsx           # الشريط العلوي (المشروع + حالة المناعة)
    ├── Chat.tsx             # محادثة + سياق توجيه النموذج
    ├── AgentWorkspace.tsx   # بطاقة Manus: خطوات / ملفات / سجل نشاط / بوابة موافقة
    ├── ProviderPanel.tsx    # سجل المزوّدين + الحالة + الحصص
    ├── ApiKeys.tsx          # إدارة المفاتيح (BYOK — SecretRef فقط)
    ├── Pill.tsx / Logo.tsx  # عناصر مشتركة
```

## كيف يتحقق التصميم المطلوب

| الطبقة | أين؟ |
| --- | --- |
| **واجهة موحّدة** (الواجهة لا تعرف أي API) | `App.tsx` + `components/*` — الواجهة تتحدث إلى `kernel.ts` فقط |
| **Unified AI Gateway / Model Router** | `ModelRouter` الحقيقي من `@aok/models` + `RoutingRequirement` من `@aok/contracts` |
| **Provider Registry** (Gemini/OpenRouter/HF/Anthropic/Ollama) | `kernel.ts` → `PROVIDER_SEED` (أجهزة stub حتى تُوصَّل الـAdapters) |
| **قاعدة: الواجهة لا تحمل مفاتيح** | `ApiKeys.tsx` يعرض `SecretRef` فقط (RULE 007) |
| **اختيار النموذج اقتراح فقط (C17)** | مُعلَن في `Chat.tsx` + منطق التوجيه في `kernel.ts` |

## الخطوة التالية (خريطة الربط)

1. **Adapters حقيقية**: `adapters/gemini` · `adapters/openrouter` · `adapters/huggingface` · `adapters/ollama`
   تنفّذ `ModelProvider` (invoke/stream) وتُسجَّل في الـRouter.
2. **ربط الـOrchestrator**: استبدال `mock.ts` بـ`@aok/orchestrator` (DAG executor) بحيث
   يتحول العرض التجريبي إلى تنفيذ فعلي (Task → Plan → Nodes → Jobs).
3. **Vault حقيقي**: `ApiKeys.tsx` → `@aok/vault` (in-memory → 1Password/AWS KMS/HashiCorp).
4. **المناعة**: ربط بوابة المناعة (`@aok/immune`) بأحداث مساحة العمل.
