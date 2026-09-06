import type { Result } from '@aok/contracts';
import type { ExecutionContext } from './execution-context';
import type { ExecutorRegistry } from './registry';

function fail(reason: string): Result {
  return { status: 'failure', output: { error: reason }, evidence: [] };
}

/**
 * الفعل نفسه Primitive (دستور النواة): لا runAgent/executeTool/runTask،
 * بل execute(action, context) واحدة للجميع.
 *
 * المسار الذري:
 *   سياسة (هل يملك القدرة؟) → حدث (requested) → منفّذ (canExecute) → تنفيذ
 *   → حدث (completed/denied) مع الدليل → Result.
 *
 * ملاحظة حتمية: أي أثر جانبي يمر عبر ctx.emit — كل شيء يترك أثرًا.
 */
export async function execute(
  action: string,
  input: unknown,
  ctx: ExecutionContext,
  registry: ExecutorRegistry,
): Promise<Result> {
  const decision = ctx.policy.evaluate(action);

  if (!decision.allowed) {
    await ctx.emit({
      type: 'execution.denied',
      entityId: ctx.runId,
      actorId: ctx.actorId,
      payload: { action, reason: decision.reason },
    });
    return fail(decision.reason);
  }

  await ctx.emit({
    type: 'execution.requested',
    entityId: ctx.runId,
    actorId: ctx.actorId,
    payload: { action, input },
  });

  const executor = registry.resolve(action);

  if (!(await executor.canExecute(ctx))) {
    await ctx.emit({
      type: 'execution.rejected',
      entityId: ctx.runId,
      actorId: ctx.actorId,
      payload: { action, reason: 'executor cannot execute' },
    });
    return fail('executor cannot execute');
  }

  const result = await executor.execute(input, ctx);

  await ctx.emit({
    type: 'execution.completed',
    entityId: ctx.runId,
    actorId: ctx.actorId,
    payload: { action, status: result.status, evidence: result.evidence },
  });

  return result;
}
