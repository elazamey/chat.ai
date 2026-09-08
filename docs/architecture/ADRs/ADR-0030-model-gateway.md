# ADR-0030: Model Gateway

## Decision

Use `@aok/models` `ModelGateway` as the single invocation boundary above `ModelRouter` and `ModelProvider`.

The gateway:

- selects a provider through routing requirements;
- retries the next eligible provider after an invocation failure;
- returns the selected model and ordered provider attempts for audit;
- passes BYOK credentials as opaque `SecretRef`-based credentials;
- never stores or resolves raw secrets in the kernel.

## Scope

The first implementation is provider-neutral and uses `MockProvider` in local/CI mode. Concrete OpenAI, Anthropic, or Gemini adapters remain separate integrations and are not required for the zero-cost core.

## Failure behavior

If every eligible provider fails, `GatewayInvocationError` is raised with the ordered attempts. Callers can record this failure and apply their own policy; the gateway does not grant capabilities or bypass quota enforcement.
