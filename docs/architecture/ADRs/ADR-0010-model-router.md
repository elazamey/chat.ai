# ADR-0010 — Model Router مستقل + النموذج لا يقرر السلطة

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
الارتباط بمزوّد واحد يحوّل المنتج إلى "Anthropic system" أو "OpenAI system".

## القرار
- **Model Router** موحد فوق المزوّدين (Gemini/OpenAI/Anthropic/local/future) يختار حسب: task type + cost + latency + context + tool calling + reasoning + availability (مع fallback/retry).
- **النموذج لا يقرر السلطة**: LLM يقترح فقط؛ لا يستطيع grant/approve-self/modify-ledger/read-secret/bypass-policy.

## النتائج
- إيجابي: اختيار النموذج قرار تشغيلي لا معماري.
- إيجابي: أي خرج من LLM يُعامل كاقتراح يُقيَّم عبر Policy + Verification.
