export type TaskTypeHint =
  | 'planning'
  | 'coding'
  | 'review'
  | 'research'
  | 'summarization'
  | 'extraction'
  | 'vision'
  | 'embedding';

export type ModelCapability = 'completion' | 'vision' | 'tool_use' | 'structured_output' | 'embedding';

export interface ModelInfo {
  id: string;
  providerId: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  costPer1kInputUsd: number;
  costPer1kOutputUsd: number;
  latencyMs: number; // زمن استجابة معتاد (للتوجيه)
  capabilities: ModelCapability[];
}

export interface ModelProvider {
  id: string;
  models: ModelInfo[];
  invoke(req: unknown): Promise<unknown>;
  stream(req: unknown): AsyncIterable<unknown>;
}

/** متطلبات التوجيه: النموذج المختار هو اقتراح فقط (C17) — لا صلاحيات. */
export interface RoutingRequirement {
  taskType: TaskTypeHint;
  minContext?: number;
  needsTools?: boolean;
  needsStructuredOutput?: boolean;
  maxCostPer1kInputUsd?: number;
  maxLatencyMs?: number;
  preferredProviders?: string[];
}
