import type { ModelInfo, ModelProvider, SecretRef } from '@aok/contracts';

/**
 * بيانات اعتماد المزوّد (ECONOMIC PRINCIPLE 009 — BYOK):
 * المفتاح لا يُخزَّن كنص خام أبدًا؛ فقط SecretRef (RULE 007).
 * القيمة تُسترد من الـVault وقت التنفيذ كـcredential قصير العمر.
 */
export type ProviderCredentials =
  | { kind: 'byok'; secretRef: SecretRef } // Bring Your Own Key
  | { kind: 'managed'; plan?: string } // نموذج مُدار بالاشتراك/credits
  | { kind: 'none' }; // نموذج محلي/مجاني بلا مفتاح

export function byokCredentials(secretRef: SecretRef): ProviderCredentials {
  return { kind: 'byok', secretRef };
}

export function managedCredentials(plan?: string): ProviderCredentials {
  return { kind: 'managed', plan };
}

export function noCredentials(): ProviderCredentials {
  return { kind: 'none' };
}

/** معلومات النموذج الوهمي ($0). */
export const MOCK_MODEL: ModelInfo = {
  id: 'mock-1',
  providerId: 'mock',
  contextWindow: 100_000,
  maxOutputTokens: 2_000,
  supportsTools: true,
  supportsStructuredOutput: true,
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  latencyMs: 0,
  capabilities: ['completion', 'structured_output', 'tool_use'],
};

export interface MockRequest {
  taskType?: string;
  [key: string]: unknown;
}

/**
 * نموذج حتمي بـ$0 (ECONOMIC PRINCIPLE 010 — لا نحرق API quota في الـCI):
 * - planning → خطة ثابتة (عمود الفقرة للـVertical Slice المحلي)
 * - غير ذلك → استجابة ثابتة
 */
export class MockProvider implements ModelProvider {
  readonly id = 'mock';
  readonly models = [MOCK_MODEL];

  async invoke(req: unknown): Promise<{ provider: string; content: string }> {
    return { provider: 'mock', content: this.generate(req as MockRequest) };
  }

  async *stream(req: unknown): AsyncIterable<{ provider: string; content: string }> {
    yield { provider: 'mock', content: this.generate(req as MockRequest) };
  }

  private generate(req: MockRequest): string {
    if (req?.taskType === 'planning') {
      return JSON.stringify({
        plan: ['repo.read', 'test.run', 'github.pull_request.create'],
      });
    }
    return 'mock response (deterministic, $0)';
  }
}
