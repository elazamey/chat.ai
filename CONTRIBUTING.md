# Contributing — سياسة المساهمات

> الهدف: مساهمات واضحة الملكية، بلا غموض قانوني (Contributor → Policy → PR → Review → Merge → Ownership Event).
> المرجع: [`docs/OWNERSHIP_CONTRACT.md`](docs/OWNERSHIP_CONTRACT.md).

## الآلية المختارة الآن: DCO (Developer Certificate of Origin)

نعتمد **DCO** (شهادة أصل المطور) وليس CLA في هذه المرحلة، لأن المشروع
**Open Core** بترخيص Apache-2.0: كل مساهمة تدخل وفق شروط الترخيص نفسه،
وDCO يثبت أن المساهم يملك حق تقديمها. عند الحاجة لتملك حقوق أوسع أو إعادة
الترخيص التجاري، يمكن إضافة CLA لاحقًا (قرار يخص المالك).

## خطوات المساهمة

1. اقرأ [الدستور](docs/KERNEL_CONSTITUTION.md) و[عقد النواة](docs/ATOMIC_KERNEL_CONTRACT.md).
2. وقّع كل commit بـ `Signed-off-by` (دليل قبولك لـDCO أدناه).
3. أرسل PR؛ كل PR يمر عبر: Architecture Tests + Contract Tests + Unit Tests.
4. المراجعة من CODEOWNERS قبل الدمج.

## DCO — Developer Certificate of Origin v1.1

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

للتوقيع: `git commit -s` (يضيف `Signed-off-by: Your Name <email>`).
