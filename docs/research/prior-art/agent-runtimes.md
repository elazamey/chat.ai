# Prior Art — Agent Runtimes (Manus / Claude Code / …)

| البند | القيمة |
|---|---|
| **المفهوم** | فصل kernel عن الذكاء؛ الـLLM Plugin |
| **أول ظهور** | commit `c599826` |

## السابق

- **Manus:** agentic execution متعدد الخطوات + computer use — لكن الـexecution والذكاء مترابطان.
- **Claude Code:** coding agent قوي + tools — لكن مرتبط بمزوّد واحد وأنماط chat.
- **OpenAI Agent SDK / Assistants:** agent frameworks — مرتبطة بالمزوّد.
- **LangGraph / CrewAI / AutoGen:** multi-agent orchestration — لا فصل أمان/تحقق صارم.

## فارقنا

الـKernel لا يعرف Claude/Gemini/GPT؛ الـModel Router هو نقطة الوصول الوحيدة،
و"تم" لا تكفي (Verification)، والأمان Capability-based. الذكاء قابل للاستبدال (BYOK/local/mock).

## القرار

مستند في [`KERNEL_CONSTITUTION.md`](../../KERNEL_CONSTITUTION.md) (RULE 001/002) و [`ZERO_COST_ECONOMIC_CONTRACT.md`](../../ZERO_COST_ECONOMIC_CONTRACT.md).
