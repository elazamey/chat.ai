import type { Result } from '@aok/contracts';
import type { ExecutionContext } from './execution-context';

/**
 * منفّذ قدرة (Tool = Capability + Adapter — دستور النواة §Tool).
 * لا يهم هل المنفّذ Agent أو Tool أو Human أو Scheduler أو نظام آخر:
 * الـKernel يهتم فقط: هل يستطيع؟ ما السياسة؟ ماذا حدث؟ ما الدليل؟ هل تحقق؟
 */
export interface CapabilityExecutor {
  canExecute(ctx: ExecutionContext): Promise<boolean>;
  execute(input: unknown, ctx: ExecutionContext): Promise<Result>;
}
