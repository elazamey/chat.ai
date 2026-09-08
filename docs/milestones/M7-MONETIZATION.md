# M7 - Monetization

## First increment: auditable metering

M7 starts with the zero-cost core: usage is measured locally, quota decisions happen before execution, and every usage increment is appended to the tamper-evident Ledger as `UsageRecorded`.

The existing `InMemoryUsageMeter` and `BudgetQuota` remain provider-neutral. Billing adapters stay outside the kernel (`NoopBillingAdapter` for local mode and `InMemoryBillingAdapter` for tests), so paid providers are not required for builds or tests.

## Definition of Done for this increment

- Usage events include resource, amount, actor, run, and timestamp.
- Metering updates are appended to the Ledger after the in-memory total is updated.
- Ledger integrity remains valid after metering events are appended.
- Quota enforcement remains pre-execution and rejects increments over the configured budget.
- Local tests use no paid API keys or cloud credentials.

## Follow-up plans and billing increment

- `free` is the default zero-cost plan.
- `byok` increases local limits without requiring a platform API key.
- `TenantQuota` keeps usage isolated by `tenantId` and supports an optional `userId`.
- `MockBillingAdapter` is test-only and records reports/suspension state without contacting a payment provider.
