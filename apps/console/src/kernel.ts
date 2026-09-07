/**
 * جسر النواة (Kernel Bridge): النقطة الوحيدة التي تلمس فيها الواجهة النواة.
 * — أنواع الـTask/PlanNode/Job الحقيقية من @aok/contracts (مصدر الحقيقة).
 * — الـModelRouter الحقيقي من @aok/models لتوجيه المهام بين المزوّدين.
 *
 * قواعد النواة محفوظة هنا حتى في واجهة العرض:
 *  RULE 007 — لا مفتاح خام في واجهة (SecretRef فقط، والنموذج محلي/مجاني).
 *  C17      — اختيار النموذج اقتراح فقط، لا صلاحية.
 */
import type {
  ModelInfo,
  ModelProvider,
  NodeState,
  NodeType,
  RoutingRequirement,
  Task,
  TaskState,
} from '@aok/contracts';
import { ModelRouter } from '@aok/models';
import type { AgentRun, ProviderStatus, TaskTypeHint } from './domain';

export { ModelRouter };
export type { ModelInfo, ModelProvider, NodeState, NodeType, RoutingRequirement, Task, TaskState };

/* ————————————————————————————————————————————————————————————————
 * سجل المزوّدين (Provider Registry) — MVP ثابت من الكتالوج المرجعي.
 * النواة حقيقية (ModelRouter + RoutingRequirement)؛ المزوّدون أجهزة stub
 * حتى تُوصَّل الـAdapters (Gemini/OpenRouter/HuggingFace/Ollama/Anthropic).
 * ———————————————————————————————————————————————————————————————— */

const PROVIDER_SEED: Array<ModelProvider & { tier: ProviderStatus['tier']; label: string }> = [
  {
    id: 'gemini',
    label: 'Gemini',
    tier: 'Free',
    models: [
      {
        id: 'gemini-2.5-flash',
        providerId: 'gemini',
        contextWindow: 1_000_000,
        maxOutputTokens: 8_192,
        supportsTools: true,
        supportsStructuredOutput: true,
        costPer1kInputUsd: 0,
        costPer1kOutputUsd: 0,
        latencyMs: 400,
        capabilities: ['completion', 'vision', 'tool_use', 'structured_output'],
      },
    ],
    invoke: async () => ({ provider: 'gemini', content: '' }),
    stream: async function* () {
      yield { provider: 'gemini', content: '' };
    },
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    tier: 'Free tier',
    models: [
      {
        id: 'deepseek-chat',
        providerId: 'openrouter',
        contextWindow: 128_000,
        maxOutputTokens: 8_192,
        supportsTools: true,
        supportsStructuredOutput: true,
        costPer1kInputUsd: 0.0,
        costPer1kOutputUsd: 0.0,
        latencyMs: 600,
        capabilities: ['completion', 'tool_use', 'structured_output'],
      },
    ],
    invoke: async () => ({ provider: 'openrouter', content: '' }),
    stream: async function* () {
      yield { provider: 'openrouter', content: '' };
    },
  },
  {
    id: 'huggingface',
    label: 'HuggingFace',
    tier: 'Free tier',
    models: [
      {
        id: 'llama-3.3-70b-instruct',
        providerId: 'huggingface',
        contextWindow: 32_000,
        maxOutputTokens: 4_096,
        supportsTools: false,
        supportsStructuredOutput: false,
        costPer1kInputUsd: 0,
        costPer1kOutputUsd: 0,
        latencyMs: 900,
        capabilities: ['completion'],
      },
    ],
    invoke: async () => ({ provider: 'huggingface', content: '' }),
    stream: async function* () {
      yield { provider: 'huggingface', content: '' };
    },
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    tier: 'BYOK',
    models: [
      {
        id: 'claude-3.5-sonnet',
        providerId: 'anthropic',
        contextWindow: 200_000,
        maxOutputTokens: 8_192,
        supportsTools: true,
        supportsStructuredOutput: true,
        costPer1kInputUsd: 3.0,
        costPer1kOutputUsd: 15.0,
        latencyMs: 300,
        capabilities: ['completion', 'vision', 'tool_use', 'structured_output'],
      },
    ],
    invoke: async () => ({ provider: 'anthropic', content: '' }),
    stream: async function* () {
      yield { provider: 'anthropic', content: '' };
    },
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    tier: 'Local',
    models: [
      {
        id: 'qwen2.5-coder:14b',
        providerId: 'ollama',
        contextWindow: 32_000,
        maxOutputTokens: 4_096,
        supportsTools: true,
        supportsStructuredOutput: false,
        costPer1kInputUsd: 0,
        costPer1kOutputUsd: 0,
        latencyMs: 1_200,
        capabilities: ['completion', 'tool_use'],
      },
    ],
    invoke: async () => ({ provider: 'ollama', content: '' }),
    stream: async function* () {
      yield { provider: 'ollama', content: '' };
    },
  },
];

export function buildRouter(): ModelRouter {
  const router = new ModelRouter();
  for (const p of PROVIDER_SEED) router.registerProvider(p);
  return router;
}

/** تفضيلات المزوّدين لكل نوع مهمة (تكلفة أقل → أولوية أعلى). */
export const TASK_PROVIDER_PRIORITY: Record<TaskTypeHint, string[]> = {
  planning: ['gemini', 'openrouter', 'ollama'],
  coding: ['gemini', 'openrouter', 'anthropic', 'ollama'],
  research: ['openrouter', 'gemini'],
  summarization: ['gemini', 'huggingface'],
  vision: ['gemini', 'anthropic'],
};

/**
 * توجيه مهمة عبر الـModelRouter الحقيقي → معلومات النموذج المختار (اقتراح فقط).
 */
export function routeTask(taskType: TaskTypeHint, needsTools = false): ModelInfo | null {
  try {
    const req: RoutingRequirement = {
      taskType,
      needsTools,
      preferredProviders: TASK_PROVIDER_PRIORITY[taskType],
    };
    return buildRouter().choose(req);
  } catch {
    return null;
  }
}

/** حالة المزوّدين للوحة المفاتيح/الـProvider Panel (محاكاة صحّة). */
export function providerStatus(): ProviderStatus[] {
  return [
    { name: 'Gemini', tier: 'Free', status: 'healthy', models: 'gemini-2.5-flash', last: 'قبل دقيقة' },
    { name: 'OpenRouter', tier: 'Free tier', status: 'healthy', models: 'deepseek-chat', last: 'قبل ٣ د' },
    { name: 'HuggingFace', tier: 'Free tier', status: 'rate_limited', models: 'llama-3.3-70b', last: 'قبل ٩ د' },
    { name: 'Anthropic', tier: 'BYOK', status: 'healthy', models: 'claude-3.5-sonnet', last: '—' },
    { name: 'Ollama', tier: 'Local', status: 'offline', models: 'qwen2.5-coder:14b', last: 'غير متصل' },
  ];
}

/* ————————————————————————————————————————————————————————————————
 * عرض Task من عقد النواة الحقيقي (Task + NodeState) داخل بطاقة الـAgent Run.
 * ———————————————————————————————————————————————————————————————— */

const NODE_LABEL: Record<NodeType, string> = {
  RESEARCH: 'تحليل المتطلبات',
  CODE: 'كتابة الكود',
  BROWSER: 'عمليات المتصفح',
  TOOL: 'تنفيذ أداة',
  REVIEW: 'مراجعة',
  VERIFY: 'تحقق',
  APPROVE: 'موافقة',
  SUBTASK: 'مهمة فرعية',
};

const STATE_LABEL: Record<TaskState, string> = {
  PLANNED: 'مخطط',
  RUNNING: 'قيد التنفيذ',
  WAITING_APPROVAL: 'بانتظار الموافقة',
  VERIFYING: 'جارٍ التحقق',
  PAUSED: 'معلّق',
  COMPLETED: 'مكتمل',
  FAILED: 'فشل',
  CANCELLED: 'ملغي',
};

export { NODE_LABEL, STATE_LABEL };

/** بناء واجهة AgentRun من مهمة حقيقية (Task) — جسر عقد النواة → الواجهة. */
export function runFromTask(task: Task, files: AgentRun['files']): AgentRun {
  return {
    id: task.id,
    project: 'canyou',
    goal: task.goal,
    state:
      task.state === 'COMPLETED'
        ? 'completed'
        : task.state === 'FAILED' || task.state === 'CANCELLED'
          ? 'failed'
          : task.state === 'WAITING_APPROVAL'
            ? 'needs_approval'
            : 'running',
    nodes: [],
    files,
  };
}
