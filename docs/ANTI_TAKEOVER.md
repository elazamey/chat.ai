# ANTI-TAKEOVER — مراقبة مضادة للاستحواذ

> مراقبة تغييرات السيطرة على الأصول. أي انحراف = `OWNERSHIP_ALERT`.
> التشغيل: `bash scripts/ownership-audit.sh` (يُدمج لاحقًا في CI/جدولة).

## ما يُراقب

```text
Repository transfer      ← owner.login تغيّر
Owner change             ← owner.login تغيّر
Admin added              ← collaborators (مستقبلًا)
Branch protection removed ← protection endpoint
Signing key changed      ← (مستقبلًا: مقارنة بصمة المفتاح)
Domain DNS changed       ← (مستقبلًا: dns lookup)
Package owner changed    ← (مستقبلًا: npm/pypi owner)
Release key changed      ← (مستقبلًا)
```

## الناتج

```text
SECURITY_ALERT   ← تهديد أمني (مثل كشف سر)
OWNERSHIP_ALERT  ← تغيير في ملكية/سيطرة (أخطر)
```

## قابلية التنفيذ الحالية

`scripts/ownership-audit.sh` يفحص الآن: مالك المستودع + حماية الـmain + وجود ملفات الهوية والترخيص.
الباقي يُضاف عند وجود البنية (Organization + domains + registries).
