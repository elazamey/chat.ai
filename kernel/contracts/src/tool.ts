import type { ZodTypeAny } from 'zod';
import type { Actor } from './actor';
import type { Capability } from './capabilities';

export type SideEffect = 'none' | 'read' | 'write' | 'network' | 'shell' | 'deploy' | 'secret';

export interface NetworkPolicy {
  mode: 'none' | 'allowlist';
  domains?: string[];
}

/** العقد الرسمي للأداة (C14): لا تنفيذ بدون عقد. */
export interface ToolContract {
  id: string;
  version: string;
  description: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
  permissions: Capability[];
  sideEffects: SideEffect[];
  networkPolicy: NetworkPolicy;
  timeoutMs: number;
}

export interface ToolExecutionContext {
  runId: string;
  taskId: string;
  jobId: string;
  actor: Actor;
}

export type ToolHandler<I = unknown, O = unknown> = (
  input: I,
  ctx: ToolExecutionContext,
) => Promise<O>;
