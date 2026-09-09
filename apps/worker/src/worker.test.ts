import { afterEach, describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import worker from './index';
import { getRun, listRunsByTask, listTasks, pageSize } from './storage';

type Statement = {
  bind: (...values: unknown[]) => Statement;
  all: <T>() => Promise<{ results: T[] }>;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

function fakeDatabase(rows: Record<string, string>[] = [], writes: { count: number } = { count: 0 }): D1Database {
  const statement: Statement = {
    bind: () => statement,
    all: async <T>() => ({ results: rows as T[] }),
    first: async <T>() => (rows[0] as T | undefined) ?? null,
    run: async () => {
      writes.count += 1;
      return { success: true };
    },
  };
  return { prepare: () => statement } as unknown as D1Database;
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`https://example.com${path}`, init);
}

afterEach(() => vi.restoreAllMocks());

describe('worker persistence boundary', () => {
  it('rejects /run explicitly when D1 is unavailable', async () => {
    const response = await worker.fetch(
      request('/run', { method: 'POST', body: JSON.stringify({ task: 'test' }) }),
      { CELIA_MODE: 'local' },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'D1 persistence is required for /run',
    });
  });

  it('serves /runs, /runs/:id, and /tasks only through the configured D1 boundary', async () => {
    const db = fakeDatabase([{
      run_id: 'run-1',
      task_id: 'task-1',
      task: 'test',
      mode: 'local',
      verdict: 'PASSED',
      results_json: '[]',
      verification_json: '{}',
      usage_json: '{}',
      evidence_json: '[]',
      created_at: '2026-09-09T00:00:00.000Z',
      completed_at: '2026-09-09T00:00:00.000Z',
    }]);
    const env = { CELIA_MODE: 'local', DB: db };

    expect((await worker.fetch(request('/runs?limit=1&task_id=task-1'), env)).status).toBe(200);
    expect((await worker.fetch(request('/runs/run-1'), env)).status).toBe(200);
    expect((await worker.fetch(request('/tasks?limit=1'), env)).status).toBe(200);
  });

  it('persists a successful /run before returning the response', async () => {
    const writes = { count: 0 };
    const response = await worker.fetch(
      request('/run', { method: 'POST', body: JSON.stringify({ task: 'persist this run' }) }),
      { CELIA_MODE: 'local', DB: fakeDatabase([], writes) },
    );

    expect(response.status).toBe(200);
    expect(writes.count).toBe(1);
  });
});

describe('D1 storage query boundaries', () => {
  it('caps invalid and excessive page sizes', () => {
    expect(pageSize(null)).toBe(25);
    expect(pageSize('0')).toBe(25);
    expect(pageSize('1000')).toBe(100);
    expect(pageSize('10')).toBe(10);
  });

  it('deserializes stored run records and task summaries', async () => {
    const db = fakeDatabase([{
      run_id: 'run-1',
      task_id: 'task-1',
      task: 'test',
      mode: 'local',
      verdict: 'PASSED',
      results_json: '[]',
      verification_json: '{}',
      usage_json: '{}',
      evidence_json: '[]',
      created_at: '2026-09-09T00:00:00.000Z',
      completed_at: '2026-09-09T00:00:00.000Z',
    }]);

    await expect(getRun(db, 'run-1')).resolves.toMatchObject({ run_id: 'run-1' });
    await expect(listRunsByTask(db, 10, 'task-1')).resolves.toHaveLength(1);
    await expect(listTasks(db, 10)).resolves.toEqual([expect.objectContaining({ task_id: 'task-1' })]);
  });
});
