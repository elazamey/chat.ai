# ADR index

| # | العنوان | القرار |
|---|---|---|
| 0001 | [TypeScript + Monorepo + pnpm](./ADR-0001-typescript-monorepo.md) | TS للنواة، pnpm workspace، Zod→JSON Schema→OpenAPI |
| 0002 | [Kernel Contracts-only + Agent Plugin](./ADR-0002-kernel-contracts-only.md) | النواة تعرف العقود فقط؛ الـAgent Plugin |
| 0003 | [Capability-Based Security + Policy Approval](./ADR-0003-capability-security.md) | Capabilities + deny-precedence + موافقة policy-driven |
| 0004 | [Event-Driven + Append-Only Ledger](./ADR-0004-event-ledger.md) | كل فعل Event؛ Ledger append-only بسلسلة تجزئة |
| 0005 | [Verification First-Class](./ADR-0005-verification-first-class.md) | "تم" ممنوع؛ Claim→Evidence→Verification |
| 0006 | [Task/Run/Node/Job/ToolExecution](./ADR-0006-task-run-node-job.md) | فصل هرم التنفيذ |
| 0007 | [State Machines as Code](./ADR-0007-state-machines-code.md) | transition() فعلية ترفض الانتقال غير القانوني |
| 0008 | [Tool Registry > Agent Registry + لا Shell مفتوح](./ADR-0008-tools-no-open-shell.md) | أدوات متخصصة بعقود صارمة |
| 0009 | [Sandbox منذ اليوم الأول + أسرار خارج النواة](./ADR-0009-sandbox-secrets.md) | عزل + SecretRef/Vault |
| 0010 | [Model Router مستقل + النموذج لا يقرر السلطة](./ADR-0010-model-router.md) | Routing موحد، LLM=اقتراح فقط |
| 0011 | [تقسيم الذاكرة + RAG مستقل](./ADR-0011-memory-rag.md) | فصل Memory عن Knowledge |
| 0012 | [MCP كـAdapter](./ADR-0012-mcp-adapter.md) | MCP integration protocol وليس foundation |
| 0013 | [PostgreSQL أساسي + Redis غير إلزامي](./ADR-0013-postgres-redis.md) | Postgres إنتاج، SQLite dev |
| 0014 | [CLI أولوية + Vertical Slice MVP](./ADR-0014-cli-vertical-slice.md) | celia CLI + سيناريو end-to-end |
