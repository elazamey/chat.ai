import { createLocalSmokeRunner, type ProofCarryingOutcome } from '@aok/cli';
import { getRun, listRuns, listTasks, pageSize, saveRun } from './storage';

interface Env {
  CELIA_MODE?: string;
  DB?: D1Database;
}

interface RunRequest {
  task: string;
}

const MAX_BODY_BYTES = 64 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const cors = {
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-origin': allowedOrigin(origin),
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/health') {
      if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);
      return json(
        {
          status: 'ok',
          service: 'celia-worker',
          mode: env.CELIA_MODE === 'cloud' ? 'cloud' : 'local',
          persistence: env.DB ? 'd1' : 'unavailable',
        },
        200,
        cors,
      );
    }

    if (request.method === 'GET' && url.pathname === '/runs') {
      if (!env.DB) return json({ error: 'D1 persistence is not configured' }, 503, cors);
      return json({ runs: await listRuns(env.DB, pageSize(url.searchParams.get('limit'))) }, 200, cors);
    }

    const runMatch = url.pathname.match(/^\/runs\/([^/]+)$/);
    if (request.method === 'GET' && runMatch) {
      if (!env.DB) return json({ error: 'D1 persistence is not configured' }, 503, cors);
      const run = await getRun(env.DB, decodeURIComponent(runMatch[1]!));
      return run ? json(run, 200, cors) : json({ error: 'run not found' }, 404, cors);
    }

    if (request.method === 'GET' && url.pathname === '/tasks') {
      if (!env.DB) return json({ error: 'D1 persistence is not configured' }, 503, cors);
      return json({ tasks: await listTasks(env.DB, pageSize(url.searchParams.get('limit'))) }, 200, cors);
    }

    if (url.pathname !== '/run') return json({ error: 'not found' }, 404, cors);
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    try {
      const body = await readJson(request);
      const { task } = parseRunRequest(body);
      const outcome = await createLocalSmokeRunner(env.CELIA_MODE === 'cloud' ? 'cloud' : 'local').run(task);
      if (env.DB) await saveRun(env.DB, outcome);
      return json(publicOutcome(outcome), 200, cors);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed';
      const status = message.startsWith('request body') || message.startsWith('task ') ? 400 : 500;
      return json({ error: message }, status, cors);
    }
  },
} satisfies ExportedHandler<Env>;

function parseRunRequest(body: unknown): RunRequest {
  if (typeof body !== 'object' || body === null || !('task' in body) || typeof body.task !== 'string') {
    throw new Error('request body must contain a string task');
  }
  const task = body.task.trim();
  if (!task) throw new Error('task must not be empty');
  return { task };
}

async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('request body is too large');
  return request.json();
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

function json(value: unknown, status: number, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
  });
}

function allowedOrigin(origin: string | null): string {
  const allowed = new Set([
    'https://celia-console.pages.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
  return origin && allowed.has(origin) ? origin : 'https://celia-console.pages.dev';
}
