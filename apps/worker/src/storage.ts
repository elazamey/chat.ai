import type { ProofCarryingOutcome } from '@aok/cli';

const MAX_PAGE_SIZE = 100;

export interface RunRecord {
  run_id: string;
  task_id: string;
  task: string;
  mode: string;
  verdict: string;
  results: unknown;
  verification: unknown;
  usage: unknown;
  evidence: unknown[];
  created_at: string;
  completed_at: string;
}

export function pageSize(value: string | null): number {
  const parsed = Number(value ?? 25);
  if (!Number.isInteger(parsed) || parsed < 1) return 25;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

export async function saveRun(db: D1Database, outcome: ProofCarryingOutcome, now = new Date().toISOString()): Promise<void> {
  await db.prepare(`
    INSERT INTO runs (
      run_id, task_id, task, mode, verdict, results_json,
      verification_json, usage_json, evidence_json, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    outcome.runId,
    outcome.taskId,
    outcome.intent,
    outcome.mode,
    outcome.verdict,
    JSON.stringify(outcome.results),
    JSON.stringify(outcome.verification),
    JSON.stringify(outcome.usage),
    JSON.stringify(outcome.verification.evidence),
    now,
    now,
  ).run();
}

export async function getRun(db: D1Database, runId: string): Promise<RunRecord | null> {
  const row = await db.prepare(`
    SELECT run_id, task_id, task, mode, verdict, results_json,
      verification_json, usage_json, evidence_json, created_at, completed_at
    FROM runs
    WHERE run_id = ?
    LIMIT 1
  `).bind(runId).first<Record<string, string>>();
  return row ? deserialize(row) : null;
}

export async function listRuns(db: D1Database, limit: number): Promise<RunRecord[]> {
  return listRunsByTask(db, limit);
}

export async function listRunsByTask(db: D1Database, limit: number, taskId?: string): Promise<RunRecord[]> {
  const query = taskId ? `
    SELECT run_id, task_id, task, mode, verdict, results_json,
      verification_json, usage_json, evidence_json, created_at, completed_at
    FROM runs
    WHERE task_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  ` : `
    SELECT run_id, task_id, task, mode, verdict, results_json,
      verification_json, usage_json, evidence_json, created_at, completed_at
    FROM runs
    ORDER BY created_at DESC
    LIMIT ?
  `;
  const statement = db.prepare(query);
  const result = taskId
    ? await statement.bind(taskId, limit).all<Record<string, string>>()
    : await statement.bind(limit).all<Record<string, string>>();
  return result.results.map(deserialize);
}

export async function listTasks(db: D1Database, limit: number): Promise<Array<Pick<RunRecord, 'task_id' | 'task' | 'verdict' | 'created_at' | 'completed_at'>>> {
  const result = await db.prepare(`
    SELECT task_id, task, verdict, created_at, completed_at
    FROM runs
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all<Pick<RunRecord, 'task_id' | 'task' | 'verdict' | 'created_at' | 'completed_at'>>();
  return result.results;
}

function deserialize(row: Record<string, string>): RunRecord {
  return {
    run_id: row.run_id,
    task_id: row.task_id,
    task: row.task,
    mode: row.mode,
    verdict: row.verdict,
    results: JSON.parse(row.results_json),
    verification: JSON.parse(row.verification_json),
    usage: JSON.parse(row.usage_json),
    evidence: JSON.parse(row.evidence_json) as unknown[],
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}
