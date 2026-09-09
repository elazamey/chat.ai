import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LocalRunner, ProofCarryingOutcome } from '@aok/cli';

export interface RunRequest {
  task: string;
}

export function parseRunRequest(body: unknown): RunRequest {
  if (typeof body !== 'object' || body === null || !('task' in body) || typeof body.task !== 'string') {
    throw new Error('request body must contain a string task');
  }

  const task = body.task.trim();
  if (!task) throw new Error('task must not be empty');
  return { task };
}

export async function runTask(
  request: IncomingMessage,
  response: ServerResponse,
  runner: LocalRunner,
  body: unknown,
): Promise<void> {
  const { task } = parseRunRequest(body);
  const outcome = await runner.run(task);
  sendJson(response, 200, publicOutcome(outcome));
}

function publicOutcome(outcome: ProofCarryingOutcome) {
  return {
    run_id: outcome.runId,
    task_id: outcome.taskId,
    task: outcome.intent,
    mode: outcome.mode,
    verdict: outcome.verdict,
    results: outcome.results,
    verification: outcome.verification,
    usage: outcome.usage,
    evidence: outcome.verification.evidence,
  };
}

export function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}
