# ADR-0009 — Sandbox منذ اليوم الأول + أسرار خارج النواة

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
بناء Agent ممتاز ثم محاولة عزله لاحقًا = إعادة بناء. والأسرار المبعثرة (`process.env.KEY`) غير قابلة للتدقيق.

## القرار
- كل execution يمر عبر **Sandbox Manager** بحدود: fs / CPU / RAM / timeout / processes / network / workspace boundary / secret policy.
- مناطق ثقة منفصلة: `Control Plane` / `Kernel` / `Sandbox` / `Vault`.
- الأسرار: `SecretRef → Vault → Short-lived credential → Tool`. الـKernel يعرف **المرجع فقط**.
- بداية: Vault adapter بسيط؛ لاحقًا: 1Password / AWS KMS / HashiCorp Vault.

## النتائج
- إيجابي: عزل كامل منذ البداية، والقيمة السرية لا تدخل الـLedger/السياق.
- قيد: الـSandbox الحقيقي (gVisor/µVM) في مرحلة لاحقة (Q2) — لكن العقد موجود من اليوم الأول.
