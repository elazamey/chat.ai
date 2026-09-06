# INVENTORSHIP — سجل الاختراع والأصالة

> **ليس** ادعاء براءة اختراع، ولا تحويلًا لأي فكرة إلى حق حصري.
> الهدف: **تسجيل ما ندّعي أنه أصلي، ومتى ظهر في المشروع، وما الذي استُلهم من مصادر أخرى.**
> المرجع: [`OWNERSHIP_CONTRACT.md`](OWNERSHIP_CONTRACT.md) · [`research/prior-art/`](research/prior-art/).

## ما ندّعي أنه أصلي (بحسب ظهوره في المشروع)

| # | المفهوم | أول ظهور | الحالة |
|---|---|---|---|
| 1 | **النواة الذرية الانشطارية** (4 primitives: Entity/Event/Capability/Result) | commit `c599826` | منفّذ |
| 2 | **النواة ontology-neutral** (لا Task/Agent/Tool كنوع خاص) | commit `c599826` | منفّذ |
| 3 | **الفعل Primitive موحّد** `execute(action, context)` لكل المنفّذين | commit `c599826` | منفّذ |
| 4 | **الحالة = replay(events)** (Projections) والـLedger مصدر الحقيقة | commit `c599826` | منفّذ |
| 5 | **Capability Composition** (Agent = تركيب قدرات، لا class بذكاء) | commit `c599826` | منفّذ |
| 6 | **Economic Kernel** (metering/quota داخل النواة، billing خارجها) | commit `321896a` | منفّذ |
| 7 | **Control/Execution Plane split** + Local Runner | commit `321896a` | منفّذ |
| 8 | **Namespace + Schema Registry** (لا `admin.superpower`) | commit `ae773cd` | منفّذ |
| 9 | **Proof-Carrying Execution** (كل إنجاز بدليل + تحقق) | commit `e50e898` | منفّذ |
| 10 | **Ownership/Provenance Ledger** (الملكية كـevent history) | هذا الالتزام | منفّذ |

## ما استُلهم من خارج (Known prior art)

| المفهوم | مصادر الإلهام | الفارق في تصميمنا |
|---|---|---|
| Event Sourcing / CQRS | Fowler, Greg Young | مطبّق كبدائيات + Projections فوق Ledger append-only |
| Capability-based security | EROS/Capability literature | مطبّق كنموذج صلاحيات للـAgents مع deny-precedence |
| Agent runtimes | Manus, Claude Code, AutoGPT, LangGraph | فصل kernel عن الذكاء (LLM=Plugin) بدل ربطه |
| GitHub Actions runners | GitHub | نفس الفلسفة: Control Plane سحابي + Execution محلي |
| Tool schema contracts | OpenAI function calling, MCP | عقد موحّد + Namespace/Schema Registry |
| SBOM/Attestation | SLSA, in-toto, GitHub Attestations | هيكل إثبات محلي قابل للتحقق |

> التفصيل في [`docs/research/prior-art/`](research/prior-art/) — لكل مفهوم: المصادر والفروقات وقرار التصميم.
