# ADR-0003 — Capability-Based Security + Policy Approval

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
`admin = true` غير قابل للتدقيق ويسمح بانفجار الصلاحيات.

## القرار
- صلاحيات دقيقة (Capabilities): `repo.read`, `git.push`, `shell.execute`, `secret.read`, `deployment.create`…
- الـPolicy Engine يقيّم كل طلب: **Who? What? Where? Why? When? Under which approval?**
- `deny` له الأسبقية دائمًا على `allow`.
- الموافقة البشرية **policy-driven**: read/edit → auto، push/delete/deploy/secret → approval.

## النتائج
- إيجابي: تدقيق دقيق لكل فعل (من؟ ماذا؟ بماذا؟).
- إيجابي: لا Agent يحصل على صلاحيات النظام.
- قيد: يتطلب Grants دقيقة لكل أداة/Agent (مقصود — أمان أولًا).
