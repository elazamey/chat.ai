# ADR-0026 — Digital Ownership & Provenance Layer

- **الحالة:** Accepted
- **التاريخ:** 2026-09-06

## السياق
`LICENSE` وحده لا يثبت مَن كتب ومتى، ولا يفصل ملكية الكود عن العلامة عن ملكية الغير،
ولا يحمي من الاستحواذ أو فقدان الأصول.

## القرار
- **6 عقود عليا:** `01 KERNEL_CONSTITUTION` · `02 ATOMIC_KERNEL_CONTRACT` · `03 ZERO_COST_ECONOMIC_CONTRACT`
  · `04 SECURITY_CONTRACT` · `05 OWNERSHIP_CONTRACT` · `06 PROVENANCE_CONTRACT`.
- **الهوية:** `PROJECT_IDENTITY.yaml` + `PROJECT_GENESIS.md` (genesis hash = `sha256([id,name,namespace,owner,repo-owner,genesis-commit])`).
- **Ownership Ledger:** أحداث `ownership.*` داخل نفس الـLedger append-only (`kernel/provenance`).
- **حزمة الإثبات:** `celia ownership prove` → `ownership-proof/` (identity/genesis/git-history/architecture-hashes/sbom/attestations/ledger-export).
- **قابلية التنفيذ:** Ownership Tests (هوية، genesis قابل لإعادة الحساب، CODEOWNERS، secrets scan،
  تتبع تراخيص الغير، سياسة المساهمات DCO، اكتشاف تغيير الهوية) + `scripts/ownership-audit.sh`.
- **فصل قانوني صريح:** ملكية المستودع ≠ ملكية الكود ≠ ملكية الفكرة؛ الفكرة المجردة لا تتحول لحق حصري؛
  المنظومة دليل تقني لا شهادة قانونية؛ العلامة تُدار منفصلة؛ Open Core (Apache-2.0) ≠ Proprietary (خارج المستودع).

## النتائج
- إيجابي: الملكية والمصدر أصبحا جزءًا من النواة وقابلين للتدقيق، مع النسخ المستقلة ومراقبة الاستحواذ.
- قيد: الحماية القانونية الفعلية تعتمد على نوع الأصل والقانون والعقود والتسجيلات — لا على هذه المنظومة وحدها.
