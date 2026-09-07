# ASSET REGISTER — سجل الأصول الرقمية

> الأصول التجارية التي قد تضيع إن فُقدت السيطرة عليها: GitHub / Domain / DNS / Package namespaces / Registry / Social.
> هذا السجل مركزي وموثّق خارج المستودع أيضًا (لا تثق بنسخة واحدة).

| الأصل | النوع | الحالة | الملاحظة |
|---|---|---|---|
| github.com/elazamey/chat.ai | Repository | مملوك | المالك `elazamey` |
| (celia-org) | GitHub Organization | مخطط | فصل الهوية الشخصية عن المشروع |
| (domain: celia.*) | Domain | غير مسجّل بعد | يُسجَّل قبل الإطلاق |
| @celia/* | npm namespace | مخطط | يُحجز عبر كل السجلات |
| (PyPI/Docker/GHCR) | Package namespaces | مخطط | `PACKAGE_OWNERSHIP` |
| DNS | DNS | — | مرتبط بالنطاق |
| (social handles) | Social | — | تُحجز مع الإطلاق |

## قاعدة

```text
لا إطلاق عام قبل حجز: النطاق + namespace الحزم + الحسابات.
```

*محدَّث يدويًا؛ `ownership-audit.sh` يفحص ما يمكن فحصه آليًا (مالك المستودع، حماية الفرع).*
