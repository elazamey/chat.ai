# Prior Art — Event Sourcing / Projections

| البند | القيمة |
|---|---|
| **المفهوم** | الحالة = replay(events)؛ الـLedger مصدر الحقيقة |
| **أول ظهور** | commit `c599826` |

## السابق

- **Event Sourcing (Martin Fowler / Greg Young):** append-only + projections.
- **CQRS:** فصل القراءة عن الكتابة.
- **Kafka/Kinesis:** event logs موزعة.

## فارقنا

نطبّق الفكرة على **agent runtime**: كل فعل (tool/approval/file/network/policy) حدث،
والحالة (Task/Run/Approval/Usage/Memory) Projections قابلة لإعادة البناء — مع سلسلة تجزئة كاشفة للعبث.

## القرار

مستند في [`ATOMIC_KERNEL_CONTRACT.md`](../../ATOMIC_KERNEL_CONTRACT.md) §6 و [`INVENTORSHIP.md`](../../INVENTORSHIP.md).
