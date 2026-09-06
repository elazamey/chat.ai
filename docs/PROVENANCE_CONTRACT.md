# PROVENANCE CONTRACT v1 — عقد المصدر والأصل (06)

> يُثبت **مصدر** كل شيء: من كتب، ومتى، ومن أي commit، وبأي ترخيص، وكيف أُنتج الـartifact.
> هو الدليل التقني لـ"مَن ومتى وكيف" — وليس شهادة ملكية قانونية تلقائية.
> المرجع الأعلى: [`KERNEL_CONSTITUTION.md`](KERNEL_CONSTITUTION.md) · [`OWNERSHIP_CONTRACT.md`](OWNERSHIP_CONTRACT.md).

---

## 1. سلسلة الأصل

```text
PROJECT_GENESIS → ARCHITECTURE_V1 → COMMIT → RELEASE → ARTIFACT
```

## 2. الـGenesis (أول أصل)

| الحقل | القيمة |
|---|---|
| genesis_commit | `5a40a841a4db459521b404e19e30e1a7971b5770` |
| architecture_genesis | `57931300fd88aa50f47137d78c17c6f3838bcd87` |
| genesis_hash | `06a6665315ddce4b55bd3136486aabd23d337609bf4a90ef179e8e4ff4b97033` |

```text
genesis_hash = sha256([id, name, namespace, owner, repo-owner, genesis_commit])
```

- التنفيذ: [`kernel/provenance/src/genesis.ts`](../../kernel/provenance/src/genesis.ts) (`computeGenesisHash`).
- أي تعديل على الهوية يغيّر الـhash → يُكشف فورًا (قابل لإعادة الحساب).

## 3. Attestation (إثبات المصدر لكل artifact)

```text
source → commit → build → artifact
        → sha256 + SBOM + attestation + release
```

- `attestArtifact(file, commit)` → `{ sha256, path, commit, sbomRef, attestedAt }`.
- GitHub توفر Artifact Attestations لربط الـartifact بمصدره؛ نلتقط الهيكل نفسه محليًا
  ليبقى قابلاً للتحقق بدون الاعتماد على خدمة واحدة ([GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/access-to-repositories)).

## 4. حزمة الإثبات (`celia ownership prove`)

```text
ownership-proof/
├── project-identity.json
├── genesis.json
├── git-history.json
├── commits.json
├── release.json
├── artifact-hash.json
├── sbom.json
├── attestations/
├── architecture-hashes/
└── ledger-export.json
```

## 5. إعادة الإنتاج (Reproducibility)

```text
- نفس المدخلات → نفس genesis_hash
- نفس الكود → نفس sha256
- نفس الأحداث → نفس الحالة (Projections)
```

## 6. قابلية التنفيذ (اختبارات)

```text
✅ genesis hash reproducible (computeGenesisHash matches declared)
✅ attestation sha256 matches node:crypto
✅ ownership ledger chain valid (hash-chain)
✅ PROVENANCE_CONTRACT present + references genesis
```

## 7. ما لا تفعله هذه الطبقة

- لا تمنح براءة اختراع. لا تشهد ملكية "فكرة". لا تحل محل تسجيل العلامة.
- لا تمنع Fork بحد ذاتها (الترخيص وشروط GitHub هي ما يحكم النسخ المشتقة).
- هي **دليل تقني منظم** يقوّي موقف الإسناد والنسب والتسلسل الزمني عند أي نزاع.
