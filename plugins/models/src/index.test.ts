import { describe, it, expect } from 'vitest';
import { ModelRouter, NoModelAvailableError, stubProvider } from './index';
import type { ModelInfo } from '@aok/contracts';

const mk = (id: string, providerId: string, over: Partial<ModelInfo> = {}): ModelInfo => ({
  id,
  providerId,
  contextWindow: 128_000,
  maxOutputTokens: 8_000,
  supportsTools: true,
  supportsStructuredOutput: true,
  costPer1kInputUsd: 3,
  costPer1kOutputUsd: 15,
  latencyMs: 1000,
  capabilities: ['completion', 'tool_use'],
  ...over,
});

describe('ModelRouter', () => {
  it('picks the cheapest/fastest satisfying model', () => {
    const router = new ModelRouter([
      stubProvider('anthropic', [mk('claude-cheap', 'anthropic', { costPer1kInputUsd: 3, latencyMs: 800 })]),
      stubProvider('openai', [mk('gpt-expensive', 'openai', { costPer1kInputUsd: 30, latencyMs: 500 })]),
    ]);
    expect(router.choose({ taskType: 'coding' }).id).toBe('claude-cheap');
  });

  it('filters by tool-use requirement', () => {
    const router = new ModelRouter([
      stubProvider('local', [mk('tiny', 'local', { supportsTools: false })]),
      stubProvider('anthropic', [mk('claude', 'anthropic', { supportsTools: true })]),
    ]);
    expect(router.choose({ taskType: 'coding', needsTools: true }).id).toBe('claude');
  });

  it('respects context window requirement', () => {
    const router = new ModelRouter([
      stubProvider('local', [mk('small', 'local', { contextWindow: 8_000 })]),
      stubProvider('anthropic', [mk('big', 'anthropic', { contextWindow: 1_000_000 })]),
    ]);
    expect(router.choose({ taskType: 'research', minContext: 200_000 }).id).toBe('big');
  });

  it('honors preferredProviders over cost', () => {
    const router = new ModelRouter([
      stubProvider('anthropic', [mk('claude', 'anthropic', { costPer1kInputUsd: 3 })]),
      stubProvider('gemini', [mk('gemini-x', 'gemini', { costPer1kInputUsd: 50 })]),
    ]);
    expect(
      router.choose({ taskType: 'summarization', preferredProviders: ['gemini'] }).id,
    ).toBe('gemini-x');
  });

  it('throws NoModelAvailableError when nothing fits', () => {
    const router = new ModelRouter([
      stubProvider('local', [mk('small', 'local', { contextWindow: 8_000 })]),
    ]);
    expect(() => router.choose({ taskType: 'coding', minContext: 1_000_000 })).toThrow(
      NoModelAvailableError,
    );
  });
});
