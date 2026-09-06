# Prior Art — Capability-Based Security للـAgents

| البند | القيمة |
|---|---|
| **المفهوم** | صلاحيات دقيقة بدل role-based (`admin`) |
| **أول ظهور** | commit `e50e898` (Policy Engine) |

## السابق

- **EROS / KeyKOS / seL4:** capability-based OS security — قيد التطبيق على agent runtime.
- **RBAC/ABAC التقليدي:** roles/attributes — لا يمنع `admin=true` من الانفجار.
- **Cloud IAM:** scoped permissions — نموذج جيد لكنه مرتبط بالبنية السحابية.

## فارقنا

`Capability = namespace.action` مع Namespace Registry (لا `admin.superpower`)،
`deny` يسبق `allow`، الموافقة policy-driven، والـLLM لا يمنح نفسه صلاحية.

## القرار

مستند في [`SECURITY_CONTRACT.md`](../../SECURITY_CONTRACT.md) و [`KERNEL_CONSTITUTION.md`](../../KERNEL_CONSTITUTION.md) (RULE 003/009).
