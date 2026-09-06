# Prior Art — Atomic Execution Kernel

| البند | القيمة |
|---|---|
| **المفهوم** | نواة تنفيذ ذرية من 4 primitives، ontology-neutral |
| **أول ظهور في المشروع** | commit `c599826` |

## الأنظمة/المفاهيم السابقة

- **LangGraph / LangChain:** stateful graph over LLM — لكن الـLLM والعقد جزء من نفس النسيج، والنواة تعرف الـAgent.
- **AutoGPT / BabyAGI:** حلقات agent مستقلة — لكن لا فصل kernel/tools/security.
- **Manus / Claude Code (Computer Use):** تنفيذ وكيل قوي — لكن الـKernel غير مفصول عن الذكاء والصلاحيات.
- **Workflow engines (Temporal, Prefect, Airflow):** DAG + scheduler قوي — لكن بلا نموذج أمان قدرات للـAgents، وبلا Verification-first.
- **Actor/Capability OS literature (EROS, seL4, KeyKOS):** capability-based + isolation — لكن على مستوى نظام التشغيل لا agent runtime.

## فارق تصميمنا

```text
هم: Agent يعرف كل شيء، أو Workflow بلا أمان.
نحن: نواة صغيرة حتمية (Entity/Event/Capability/Result) لا تعرف Agent ولا Model ولا Tool؛
     الذكاء والأدوات Plugins فوقها؛ كل إنجاز يحتاج Evidence + Verification.
```

## القرار

البناء فوق `Entity/Event/Capability/Result` + `execute()` موحّد + Projections — مستند في
[`ATOMIC_KERNEL_CONTRACT.md`](../../ATOMIC_KERNEL_CONTRACT.md) و [`INVENTORSHIP.md`](../../INVENTORSHIP.md).
