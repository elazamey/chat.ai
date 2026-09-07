# OWNERSHIP CONTRACT v1 — عقد الملكية (05)

> **Digital Ownership & Provenance Layer** — يربط: أنت → هوية المشروع → Organization → Genesis Commit
> → تاريخ موقّع → العمارة → الكود → البناء → الـartifact → الإصدار → الـIP التجاري.
> المرجع الأعلى: [`KERNEL_CONSTITUTION.md`](KERNEL_CONSTITUTION.md). مرتبط بـ [`PROVENANCE_CONTRACT.md`](PROVENANCE_CONTRACT.md).

---

## ⚠️ حدود قانونية (تُقرأ أولًا)

هذه المنظومة **لا تمنح وحدها ملكية حصرية قانونية** لأي أصل. هي تبني **دليلًا تقنيًا قويًا**
على التأليف والنسب والتسلسل الزمني والسيطرة على الأصول. الحماية القانونية الفعلية تعتمد على
نوع الأصل والقانون المنطبق والعقود والتسجيلات المناسبة.

**فروق جوهرية (ملكية المستودع ≠ ملكية الكود ≠ ملكية الفكرة):**

- **ملكية المستودع:** السيطرة الإدارية عليه، تبدأ عمليًا من السيطرة على الحساب/المنظمة المالكة.
  ([GitHub ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service))
- **ملكية الكود/التوثيق/التصميم:** صور تعبير قد تدخل في حقوق المؤلف وفق القانون المنطبق.
- **الفكرة المجردة وحدها لا تتحول تلقائيًا إلى حق حصري لمجرد كتابتها في README أو GitHub.**
  لذلك نُسجِّل الأصل والتطور في **سجل زمني** بدل الادعاء بحصرية الفكرة.
- **الأسرار التجارية:** حمايتها مشروطة بالسرية والقيمة واتخاذ إجراءات معقولة للحماية.
- **الترخيص يحدد ما يُسمح به:** المساهمات في مستودع مرخّص تخضع لشروط ذلك الترخيص، واتفاق منفصل
  (CLA) قد يحدد حقوقًا مختلفة. المستودع العام يمكن أن يُFork — **امتلاك المستودع لا يعني حصرية
  مطلقة لكل نسخة مشتقة**، فالمحتوى العام يخضع للترخيص وشروط GitHub.
  ([GitHub ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) ·
   [GitHub Corporate ToS](https://docs.github.com/en/site-policy/github-terms/github-corporate-terms-of-service))

> **النظام لا يقول "GitHub يحمي الفكرة"؛ يقول:** أنا أتحكم في المستودع + لدي توثيق تأليف + مصدر
> إصدارات + تراخيص معلنة + سجلات مساهمات + فصل لملكية الغير + حماية للمواد السرية + نسخ مستقلة.

---

## 1. الأقسام الثلاثة للملكية

```text
Repository Control   ← GitHub owner · branch rules · CODEOWNERS · access
Source Authorship    ← provenance · signing · attestation · commit history
Brand / Business IP  ← trademark · legal records · confidentiality
```

## 2. الوثائق المكوّنة

| الوثيقة | الدور |
|---|---|
| [`PROJECT_IDENTITY.yaml`](../../PROJECT_IDENTITY.yaml) | هوية المشروع (تقني، قابل للتحقق آليًا) |
| [`PROJECT_GENESIS.md`](../../PROJECT_GENESIS.md) | أول أصل رسمي (Genesis Record) |
| [`INVENTORSHIP.md`](INVENTORSHIP.md) | ما ندّعي أنه أصلي ومتى ظهر وما استُلهم |
| [`BRAND_POLICY.md`](BRAND_POLICY.md) | العلامة منفصلة عن حقوق مؤلف الكود |
| [`ASSET_REGISTER.md`](ASSET_REGISTER.md) | domains · package namespaces · registry · social |
| [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) | IP Firewall للغير |
| [`ANTI_TAKEOVER.md`](ANTI_TAKEOVER.md) | مراقبة تغييرات الملكية |
| [`OWNERSHIP_CONTINUITY_PLAN.md`](OWNERSHIP_CONTINUITY_PLAN.md) | الاستمرارية/الخلافة (بدون أسرار) |
| [`.github/CODEOWNERS`](../../.github/CODEOWNERS) | مناطق لا تُدمج إلا بمراجعة المالك |

## 3. فصل Open Source عن Proprietary

```text
OPEN CORE (هذا المستودع، Apache-2.0)
├── Kernel · Contracts · Runner · Basic tools · Basic agents
├── Execution · Security · Verification · Economics (مقاييس/حدود)
└── Billing adapter (noop) · Vault (in-memory) · Mock provider

PROPRIETARY (خارج هذا المستودع — NOT_IN_THIS_REPOSITORY)
├── Premium routing · Enterprise controls · Commercial plugins
├── Hosted orchestration · Private integrations
└── Managed Models · Marketplace (مستقبلًا)
```

## 4. حماية الحساب/المستودع (تبدأ الملكية من هنا)

```text
2FA · SSH/GPG signing · Protected branches · CODEOWNERS
Least privilege · Actions restrictions · Secret protection · Recovery configuration
```

- `scripts/gh-protect.sh` يطبّق حماية الـmain (NO force-push/delete/direct-push + signed + CODEOWNER review).
- **Organization بدل personal repo** (للنمو): `حسابك → celia-org → celia-kernel/runner/console/marketplace`
  مع ضبط المالكين بعناية ([GitHub](https://docs.github.com/en/get-started/onboarding/getting-started-with-your-github-account)).

## 5. المساهمات (DCO الآن، CLA عند الحاجة)

```text
Contributor → Contribution Policy → DCO/CLA → PR → Review → Merge → Ownership Event
```

## 6. Ownership Ledger (أحداث)

```text
ownership.project.created · ownership.source.authored · ownership.contribution.accepted
ownership.license.declared · ownership.release.signed · ownership.artifact.attested
ownership.plugin.registered · ownership.transfer.recorded
```

الملكية جزء من **event history** (نفس Ledger append-only).

## 7. النسخ المستقلة (لا تثق بنسخة واحدة)

```text
Git repository · Release artifacts · Provenance bundle · Architecture contracts
Ownership records · Domains · Package namespaces
```

## 8. قابلية التنفيذ (Ownership Tests)

```text
✅ Project identity exists          ✅ Genesis record valid + reproducible
✅ Owner declared                   ✅ License declared
✅ CODEOWNERS protects kernel       ✅ Secrets excluded (scan)
✅ Third-party licenses tracked     ✅ Contribution policy declared
✅ Provenance reproducible          ✅ Unauthorized change detectable (ownership-audit)
```

*القانون الفعلي للملكية = نوع الأصل + القانون + العقود + التسجيلات؛ هذه المنظومة هي الدليل التقني.*
