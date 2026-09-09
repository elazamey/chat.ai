# Project Status

**Effective date:** 2026-09-09

## Active system

`celia-console` is the only active CeliaOS product and deployment path for this repository.

- Frontend: Cloudflare Pages (`celia-console.pages.dev`)
- Backend: Cloudflare Workers (`celia-api.canyoudfg.workers.dev`)
- Runtime: the local, deny-by-default AOK runtime with the explicit smoke adapter where required
- Cost policy: `$0`; no paid API keys or payment card are required for the validated path

All other CeliaOS tracks, including `celiaos_2026`, `celia-proh`, and `CELA.PRO`, are **Archive/Reference only**. Do not start new implementation work in those tracks or treat their completion claims as evidence for this product. Reuse code from them only after an explicit review and migration decision.

## Current milestone boundary

M3 (Agent + Planner contracts and truthful UI boundaries) is complete for the currently supported backend contract. The frontend does not claim backend plan, cancellation, approval, SSE, or WebSocket capabilities that do not exist.

M4 Execution/Tasks is complete for the current scope:

- D1 persistence for completed runs
- bounded polling endpoints: `/runs`, `/runs/:id`, and `/tasks`
- indexed `task_id` filtering
- real Tasks UI consumption with explicit empty/error/infrastructure states
- no change to the `/run` contract

Pagination for larger histories, event streaming, cancellation, and new Files, Knowledge, Marketplace, or other presentation-only surfaces are future milestones, not part of the M4 closure.
