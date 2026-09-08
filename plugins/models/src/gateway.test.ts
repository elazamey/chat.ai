import { describe, expect, it } from 'vitest';
import type { ModelProvider } from '@aok/contracts';
import { MockProvider } from './provider';
import { GatewayInvocationError, ModelGateway } from './gateway';
import { ModelRouter, stubProvider } from './router';

function failingProvider(): ModelProvider {
  const provider = stubProvider('failing', [
    {
      id: 'failing-1',
      providerId: 'failing',
      contextWindow: 1000,
      maxOutputTokens: 100,
      supportsTools: false,
      supportsStructuredOutput: false,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      latencyMs: 1,
      capabilities: ['completion'],
    },
  ]);
  provider.invoke = async () => {
    throw new Error('provider unavailable');
  };
  return provider;
}

describe('ModelGateway', () => {
  it('invokes the selected provider through one unified boundary', async () => {
    const gateway = new ModelGateway(new ModelRouter(), [new MockProvider()]);
    const result = await gateway.invoke({ requirement: { taskType: 'coding' }, input: { taskType: 'coding' } });
    expect(result.provider).toBe('mock');
    expect(result.modelId).toBe('mock-1');
    expect(result.attempts).toEqual(['mock']);
  });

  it('falls back after a provider failure', async () => {
    const gateway = new ModelGateway(new ModelRouter(), [failingProvider(), new MockProvider()]);
    const result = await gateway.invoke({
      requirement: { taskType: 'coding' },
      input: { taskType: 'coding' },
    });
    expect(result.provider).toBe('mock');
    expect(result.attempts).toEqual(['failing', 'mock']);
  });

  it('reports all provider failures with an auditable attempt list', async () => {
    const gateway = new ModelGateway(new ModelRouter(), [failingProvider()]);
    await expect(gateway.invoke({ requirement: { taskType: 'coding' }, input: { taskType: 'coding' } })).rejects.toMatchObject({
      attempts: ['failing'],
      cause: { message: 'provider unavailable' },
    });
  });

  it('preserves the provider failure when router candidates are not registered in the gateway', async () => {
    const router = new ModelRouter([
      stubProvider('unregistered', [
        {
          id: 'unregistered-1',
          providerId: 'unregistered',
          contextWindow: 1000,
          maxOutputTokens: 100,
          supportsTools: false,
          supportsStructuredOutput: false,
          costPer1kInputUsd: 0,
          costPer1kOutputUsd: 0,
          latencyMs: 1,
          capabilities: ['completion'],
        },
      ]),
    ]);
    const gateway = new ModelGateway(router, [failingProvider()]);

    const error = await gateway
      .invoke({ requirement: { taskType: 'coding' }, input: { taskType: 'coding' } })
      .catch((cause) => cause);

    expect(error).toBeInstanceOf(GatewayInvocationError);
    expect(error).toMatchObject({
      attempts: ['failing'],
      cause: { message: 'provider unavailable' },
    });
  });
});
