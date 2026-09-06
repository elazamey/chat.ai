# PROJECT GENESIS — أول أصل رسمي (سجل تكويني)

> سجل تقني لإثبات أصل المشروع ونسبه وتسلسله الزمني.
> **ليس** شهادة ملكية قانونية تلقائية، ولا يمنح حماية قانونية "للفكرة" بحد ذاتها.
> المرجع: [`docs/OWNERSHIP_CONTRACT.md`](docs/OWNERSHIP_CONTRACT.md) و [`docs/PROVENANCE_CONTRACT.md`](docs/PROVENANCE_CONTRACT.md).

| البند | القيمة |
|---|---|
| **Project ID** | `celia-kernel` |
| **Project Name** | Celia (اسم عمل) |
| **Namespace** | `com.celia` |
| **Primary Owner** | `elazamey` |
| **Repository** | `github.com/elazamey/chat.ai` |
| **Genesis Commit** | `5a40a841a4db459521b404e19e30e1a7971b5770` (Initial commit) |
| **Genesis Timestamp** | `2026-09-06T22:27:04+00:00` |
| **Architecture Genesis** | `57931300fd88aa50f47137d78c17c6f3838bcd87` (Architecture Contract v1) |
| **Genesis Hash** | `06a6665315ddce4b55bd3136486aabd23d337609bf4a90ef179e8e4ff4b97033` |
| **License** | Apache-2.0 (Open Core) |

## سلسلة الأصل

```text
PROJECT_GENESIS
      ↓
ARCHITECTURE_V1 (5793130)
      ↓
COMMIT (كل commit موقع في الـLedger)
      ↓
RELEASE (vX.Y.Z)
      ↓
ARTIFACT (attestation + SBOM)
```

## إثبات النسق (Provenance Chain)

- **الـgenesis hash** أعلاه = `sha256([id, name, namespace, owner, repo-owner, genesis-commit])`
  ويُعاد حسابه آليًا بواسطة `celia ownership prove` وباختبار العمارة — أي تعديل على الهوية يظهر فورًا.
- تُصدَّر حزمة الإثبات الكاملة (identity, genesis, git-history, architecture-hashes, sbom, attestations)
  إلى `ownership-proof/` (غير محفوظة في git).
- الحساب والصيغة المعتمدة: [`kernel/provenance`](kernel/provenance/src/genesis.ts).
