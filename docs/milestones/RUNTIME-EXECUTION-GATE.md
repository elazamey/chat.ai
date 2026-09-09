# Runtime Execution Gate

## Status

```text
GATE: Runtime Execution
STATUS: PASS / CLOSED
REOPEN: Only when runtime semantics or its execution path regresses
```

## Scope

This gate proves the bounded local execution path:

```text
Intent → MockProvider → Policy → Executor → Evidence → Verification
```

It covers the CLI, local HTTP API, and Cloudflare Worker smoke paths. It does
not prove real model providers, real external tools, production identity, or
production authorization.

## Evidence

The deployment smoke adapter uses explicit, side-effect-free grants and
executors for:

```text
repo.read
test.run
github.pull_request.create
```

The verified results are:

| Path | Result | Evidence |
|---|---|---:|
| CLI `run` | `PASSED` | 3 items |
| Local HTTP `POST /run` | `PASSED` / HTTP 200 | 3 items |
| Cloudflare Worker `POST /run` | `PASSED` / HTTP 200 | 3 items |

The default `LocalRunner` remains deny-by-default. The smoke adapter is
explicitly bounded and must not be treated as proof of real external execution.

## Independent Gates

These gates remain separate and are not reopened by a failure in another layer:

```text
Real Model Provider       NOT PROVEN
Real External Tools       NOT PROVEN
Production Identity       NOT PROVEN
Production Authorization  NOT PROVEN
```

For example, a GitHub authentication failure belongs to the Real External
Tools gate and does not reopen Runtime Execution.

## Reopen Criteria

Reopen this gate only if one of the following changes or regresses:

- `LocalRunner` execution semantics.
- Policy enforcement or capability dispatch.
- Evidence generation or verification.
- CLI, local HTTP, or Worker runtime wiring.

