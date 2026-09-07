# SECURITY CONTRACT v1 — العقد الأمني (04)

> جزء من العقود العليا الستة. المرجع الأعلى: [`KERNEL_CONSTITUTION.md`](KERNEL_CONSTITUTION.md) (القواعد العشر + مبادئ الذرية).
> هذا العقد يجمع كل حدود الأمان في وثيقة تنفيذية واحدة — قابل للاختبار بالكود.

| البند | القيمة |
|---|---|
| **الحالة** | `ENFORCED` |
| **الموقع** | `kernel/policy` · `kernel/execution` · `runtime/sandbox` · `adapters/vault` · `plugins/tools/*` |

---

## 1. Capability-Based Security (لا `admin`)

- صلاحيات دقيقة: `Capability = string` بصيغة `namespace.action` (خاضعة لـNamespace Registry).
- **لا يكتسب أي plugin صلاحية بمجرد تثبيته** (ATOMICITY PRINCIPLE 012).
- `deny` يسبق `allow` دائمًا. الافتراضي عند غياب المنح = **رفض**.

## 2. لا تنفيذ مميز بدون Capability (RULE 003)

```text
Agent/Tool → execute(action) → Policy.evaluate → allowed? → Execution
```

- كل استدعاء يمر عبر `execute()` في `kernel/execution`، وتتحقق `PolicyEngine` قبله.
- الـLLM **لا يمنح نفسه صلاحية** (RULE 009) — أي خرج من نموذج هو اقتراح يُقيَّم.

## 3. كل أثر جانبي عبر الحدود → Event (RULE 004 / ATOMICITY 013)

- أي Tool/File/Network/Approval/Policy قرار يُسجَّل في الـLedger append-only.
- مفروض باختبار: `execution.ts` يبث `emit` حول كل فعل.

## 4. الأسرار خارج النواة (RULE 007)

```text
SecretRef → Vault → Short-lived credential → Tool
```

- لا `process.env.KEY` مبعثرة؛ النواة تحمل **مرجعًا** فقط.
- تعمية تلقائية قبل أي تسجيل (`redactSecrets`).

## 5. عزل التنفيذ (Sandbox)

- كل execution عبر `SandboxManager` بحدود: fs / CPU / RAM / timeout / processes / network / workspace boundary.
- مناطق الثقة: `Control Plane / Kernel / Sandbox / Vault` منفصلة.

## 6. Shell مقيّد (لا Shell مفتوح)

- أدوات متخصصة؛ أي `shell` عبر allowlist + timeout + cwd + env allowlist + حدود stdout/stderr.

## 7. Network egress عبر Allowlist

- أي استدعاء خارجي (GitHub/Cloud/…) عبر Transport قابل للاستبدال ومقيّد بالنطاقات المسموحة.

## 8. التدقيق (Audit)

- `100% side effects ledgered` — كل فعل له actor + timestamp + hashes + evidence.
- `ownership-audit.sh` + Architecture Tests يراقبان الانحراف.

## 9. التحقق الآلي

```text
✓ kernel لا يستورد SDK خارجي مدفوع
✓ kernel لا يستورد plugins/adapters
✓ tools تعلن permissions
✓ execution يبث events
✓ ledger append-only
✓ BYOK يحمل SecretRef لا مفتاحًا خامًا
✓ لا أسرار في الملفات المتعقَّبة (secret scan)
```

*كل بند هنا له مقابل في `tests/architecture/`.*
