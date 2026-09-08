import type { ModelProvider, RoutingRequirement, SecretRef } from '@aok/contracts';
import type { ProviderCredentials } from './provider';
import { ModelRouter } from './router';

export interface GatewayRequest {
  requirement: RoutingRequirement;
  input: unknown;
  credentials?: ProviderCredentials;
}

export interface GatewayResponse {
  provider: string;
  modelId: string;
  content: unknown;
  attempts: string[];
}

export interface CredentialResolver {
  resolve(secretRef: SecretRef): Promise<unknown>;
}

export class GatewayInvocationError extends Error {
  constructor(public readonly attempts: string[], cause: unknown) {
    super(`all model gateway providers failed: ${attempts.join(', ')}`, { cause });
    this.name = 'GatewayInvocationError';
  }
}

/**
 * Unified model boundary. Provider failures are isolated and retried in
 * router order; credentials remain opaque SecretRefs owned by the vault.
 */
export class ModelGateway {
  private readonly providers = new Map<string, ModelProvider>();

  constructor(private readonly router: ModelRouter, providers: readonly ModelProvider[] = []) {
    for (const provider of providers) this.register(provider);
  }

  register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
    this.router.registerProvider(provider);
  }

  async invoke(request: GatewayRequest): Promise<GatewayResponse> {
    const attempts: string[] = [];
    const preferred = request.requirement.preferredProviders ?? [];
    const candidates = this.router.candidates(request.requirement).sort((a, b) => {
      const aRank = preferred.indexOf(a.providerId);
      const bRank = preferred.indexOf(b.providerId);
      return (aRank < 0 ? preferred.length : aRank) - (bRank < 0 ? preferred.length : bRank);
    });

    for (const model of candidates) {
      const provider = this.providers.get(model.providerId);
      if (!provider) continue;
      attempts.push(model.providerId);
      try {
        const content = await provider.invoke({
          ...((request.input as Record<string, unknown>) ?? {}),
          model: model.id,
          credentials: request.credentials,
        });
        return {
          provider: model.providerId,
          modelId: model.id,
          content,
          attempts,
        };
      } catch (error) {
        if (attempts.length === candidates.length) throw new GatewayInvocationError(attempts, error);
      }
    }

    throw new GatewayInvocationError(attempts, new Error('no provider available'));
  }

}
