# M6 — Real E2E + CI

## Scope

M6 proves the real GitHub boundary using the AOK execution path:

`repo.read → branch.create → file.read → file.write → git.commit → pull_request.create → pull_request.read → verification`

Every side effect is policy-checked and recorded in the ledger. The test exports the verdict, PR, commit, checks, executed actions, chain validity, and Merkle root.

## Local execution

The test is opt-in and does not run during ordinary `pnpm test`:

```bash
CELIA_E2E_REAL=1 GH_TOKEN="$GH_TOKEN" \
  pnpm exec vitest run apps/cli/src/github-e2e.real.test.ts
```

Optional variables:

- `CELIA_E2E_OWNER` and `CELIA_E2E_REPO` select the target repository.
- `CELIA_E2E_REPORT_DIR` selects the evidence directory (default: `.e2e-artifacts`).

The token must be able to read repository metadata and create branches, commits, files, and pull requests. Use a disposable test repository or a fine-grained token limited to that repository.

## Manual CI workflow

`.github/workflows/real-e2e.yml` is `workflow_dispatch` only. It requires the repository secret `GH_TOKEN`, accepts `owner` and `repo` inputs, and grants only `contents: write` and `pull-requests: write`.

The workflow uploads `report.json`, `report.md`, and the ledger evidence as the `real-github-e2e-report` artifact. It is intentionally separate from pull-request CI so normal builds never require credentials or create external resources.

## M6 Definition of Done

- The real GitHub E2E test is opt-in and passes through the same LocalRunner, policy, capability, and ledger path as production execution.
- The manual workflow runs type-safe tests against a selected repository and preserves evidence as an artifact.
- Standard CI remains secret-free and continues to run typecheck, Vitest, and the offline container smoke tests.
- Failed runs leave an auditable report identifying the last completed action and should be cleaned up manually by closing the generated PR and deleting its temporary branch.
