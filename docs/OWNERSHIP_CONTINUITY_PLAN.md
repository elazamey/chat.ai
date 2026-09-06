# OWNERSHIP CONTINUITY PLAN — خطة الاستمرارية والخلافة

> لا تترك أصلًا قيمته عالية مرتبطًا بشخص واحد أو حساب واحد.
> GitHub يتيح مفهوم successor للمستودعات الشخصية لضمان استمرارية الإدارة في ظروف معينة
> ([GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/access-to-repositories)).

## قائمة الاستمرارية (بدون أسرار هنا — الأسرار خارج المستودع)

| البند | الموقع | الحالة |
|---|---|---|
| GitHub Organization (`celia-org`) | GitHub | مخطط — أنشئها بدل الاعتماد على حساب شخصي |
| Recovery credentials | خارج المستودع (مدير أسرار) | — |
| Signing keys | خارج المستودع | — |
| Domains + DNS | `ASSET_REGISTER.md` + مسجل النطاق | — |
| Package namespaces (`@celia/*`) | السجلات | — |
| Backup للـrepository | نسخ مستقلة | — |
| Repository archive | نسخ مستقلة | — |
| Legal records | أرشيف المالك | — |

## المبدأ

```text
1. Organization مملوكة بمالكَيْن مدققَيْن على الأقل (مع الحذر: عدة owners).
2. أسرار الاسترداد في مدير أسرار منفصل، لا في المستودع.
3. نسخ مستقلة دورية: git + release artifacts + provenance bundle + العقود.
4. توثيق التسليم في Ownership Ledger (ownership.transfer.recorded).
```
