# Prior Art — Control/Execution Plane + Local Runner

| البند | القيمة |
|---|---|
| **المفهوم** | فصل الـControl عن الـExecution؛ Cloud Control + Local Execution |
| **أول ظهور** | commit `321896a` |

## السابق

- **GitHub Actions runners:** control سحابي + runners خارجية (self-hosted).
- **GitLab Runners / Buildkite agents / CircleCI:** نفس الفلسفة.
- **LangSmith / hosted agent infra:** تنفيذ سحابي — لكن compute على المزوّد.

## فارقنا

`CELIA_MODE=local|cloud` يبدّل adapters فقط؛ الـRunner منتج مفتوح المصدر بذاته؛
الـCloud يحتفظ بـcontrol/audit/state فقط، فلا ندفع compute المستخدم.

## القرار

مستند في [`ZERO_COST_ECONOMIC_CONTRACT.md`](../../ZERO_COST_ECONOMIC_CONTRACT.md) §6 و [`INVENTORSHIP.md`](../../INVENTORSHIP.md).
