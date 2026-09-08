import type { ModelInfo, ModelProvider, RoutingRequirement } from '@aok/contracts';

export class NoModelAvailableError extends Error {
  constructor(req: RoutingRequirement) {
    super(`no model satisfies the routing requirement (taskType=${req.taskType})`);
    this.name = 'NoModelAvailableError';
  }
}

/**
 * الـModel Router (C16 / ADR-0010): طبقة موحدة فوق المزوّدين.
 * يختار حسب التكلفة/الزمن/السياق/الأدوات/البنية، مع تفضيل المزوّدين وfallback.
 *
 * ملاحظة جوهرية (C17): الاختيار الناتج هو **اقتراح فقط** — لا صلاحيات،
 * وأي قرار سلطة يمر عبر الـPolicy Engine وليس عبر النموذج.
 */
export class ModelRouter {
  constructor(private providers: ModelProvider[] = []) {}

  registerProvider(provider: ModelProvider): void {
    this.providers.push(provider);
  }

  discover(): ModelInfo[] {
    return this.providers.flatMap((p) => p.models);
  }

  choose(req: RoutingRequirement): ModelInfo {
    const candidates = this.candidates(req);
    if (candidates.length === 0) throw new NoModelAvailableError(req);

    const preferred = req.preferredProviders ?? [];
    const score = (m: ModelInfo) => {
      const providerRank = preferred.includes(m.providerId)
        ? preferred.indexOf(m.providerId)
        : preferred.length;
      return providerRank * 1_000_000 + m.costPer1kInputUsd * 1_000 + m.latencyMs;
    };
    return [...candidates].sort((a, b) => score(a) - score(b))[0]!;
  }

  candidates(req: RoutingRequirement): ModelInfo[] {
    return this.discover().filter((m) => this.satisfies(m, req));
  }

  private satisfies(m: ModelInfo, req: RoutingRequirement): boolean {
    if (req.minContext !== undefined && m.contextWindow < req.minContext) return false;
    if (req.needsTools && !m.supportsTools) return false;
    if (req.needsStructuredOutput && !m.supportsStructuredOutput) return false;
    if (req.maxCostPer1kInputUsd !== undefined && m.costPer1kInputUsd > req.maxCostPer1kInputUsd)
      return false;
    if (req.maxLatencyMs !== undefined && m.latencyMs > req.maxLatencyMs) return false;
    return true;
  }
}

/** مزوّد وهمي (stub) لأغراض الاختبار/البناء — بلا تنفيذ حقيقي. */
export function stubProvider(id: string, models: ModelInfo[]): ModelProvider {
  return {
    id,
    models,
    invoke: async () => ({ provider: id, content: '' }),
    stream: async function* () {
      yield { provider: id, content: '' };
    },
  };
}
