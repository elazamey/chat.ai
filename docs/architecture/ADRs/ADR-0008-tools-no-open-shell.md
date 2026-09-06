# ADR-0008 — Tool Registry > Agent Registry + لا Shell مفتوح

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
القدرة الحقيقية تأتي من الأدوات. `shell(command: string)` مفتوح = ثغرة لا نهائية.

## القرار
- الـ**Tool Registry** هو قلب القدرات، وأهم من الـAgent Registry.
- عقد صارم: `inputSchema/outputSchema (Zod) + permissions + sideEffects + networkPolicy + timeoutMs`.
- **لا Shell مفتوح**: أدوات متخصصة (`git`, `npm`, `python`, `filesystem`, `docker`, `browser`, `github`, `cloudflare`).
- أي `shell.exec` يُقيَّد بـ: allowlist + timeout + cwd + env allowlist + network policy + حدود stdout/stderr.
- لا يُنفَّذ أي استدعاء إلا بعد `inputSchema.parse` و`outputSchema.parse` (لا تنفيذ بدون عقد).

## النتائج
- إيجابي: سطح هجوم أصغر وقابل للتدقيق.
- قيد: أدوات جديدة تتطلب عقدًا صريحًا (مقصود).
