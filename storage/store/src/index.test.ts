import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from './sqlite';
import { systemActor, type LedgerEvent } from '@aok/contracts';
import {
  SqliteEventStore,
  SqliteProjectionStore,
  SqliteCheckpointStore,
  SqliteEvidenceStore,
  PostgresEventStore,
  DurableLedger,
  projectSystem,
  type SqlDriver,
} from './index';

const tempDirs: string[] = [];
function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'aok-store-'));
  tempDirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of tempDirs.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('SqliteEventStore — durable append-only event store', () => {
  it('persists events and survives close/reopen (real restart)', async () => {
    const path = join(tempDir(), 'events.db');
    const s1 = new SqliteEventStore(path);
    await s1.append([
      { id: 'e0', seq: 0, timestamp: 't0', actor: systemActor, type: 'RunCreated', taskId: 't', runId: 'r', payload: { intent: 'x' }, prevHash: null, hash: 'h0' },
      { id: 'e1', seq: 1, timestamp: 't1', actor: systemActor, type: 'TaskCompleted', taskId: 't', runId: 'r', payload: { intent: 'x' }, prevHash: 'h0', hash: 'h1' },
    ]);
    expect(await s1.lastSeq()).toBe(2);
    await s1.close();
    expect(existsSync(path)).toBe(true);

    // "إعادة تشغيل": نفس الملف عبر متجر جديد
    const s2 = new SqliteEventStore(path);
    const events = await s2.all();
    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe('RunCreated');
    expect(events[1]!.hash).toBe('h1');
    await s2.close();
  });
});

describe('DurableLedger — hydrate/flush + tamper evidence', () => {
  it('rehydrates the exact hash chain after a simulated crash', async () => {
    const path = join(tempDir(), 'events.db');
    const store1 = new SqliteEventStore(path);
    const ledger1 = new DurableLedger(store1);
    await ledger1.hydrate();

    ledger1.append({ actor: systemActor, type: 'RunCreated', taskId: 't', runId: 'r', payload: { intent: 'x' } });
    ledger1.append({ actor: systemActor, type: 'TaskCompleted', taskId: 't', runId: 'r', payload: { intent: 'x' } });
    await ledger1.flush();
    expect(ledger1.verifyIntegrity()).toEqual({ valid: true });
    const original = ledger1.all;
    await store1.close();

    // crash → إعادة تشغيل من نفس المتجر
    const store2 = new SqliteEventStore(path);
    const ledger2 = new DurableLedger(store2);
    await ledger2.hydrate();
    expect(ledger2.all.map((e) => e.hash)).toEqual(original.map((e) => e.hash));
    expect(ledger2.verifyIntegrity()).toEqual({ valid: true });
    await store2.close();
  });

  it('detects tampering on hydrate (hash mismatch)', async () => {
    const path = join(tempDir(), 'events.db');
    const store1 = new SqliteEventStore(path);
    const ledger1 = new DurableLedger(store1);
    await ledger1.hydrate();
    ledger1.append({ actor: systemActor, type: 'RunCreated', taskId: 't', runId: 'r', payload: { intent: 'x' } });
    await ledger1.flush();
    await store1.close();

    // عبث مباشر بالمتجر: تعديل payload دون إعادة حساب hash
    const db = new DatabaseSync(path);
    db.prepare('UPDATE events SET payload = ? WHERE seq = 0').run(JSON.stringify({ intent: 'EVIL' }));
    db.close();

    const store2 = new SqliteEventStore(path);
    const ledger2 = new DurableLedger(store2);
    await expect(ledger2.hydrate()).rejects.toThrow(/tamper|invalid/i);
    await store2.close();
  });
});

describe('Projections — state = replay(events)', () => {
  it('projects runs/approvals/usage from the runner event vocabulary', () => {
    const events: LedgerEvent[] = [
      { id: 'e0', seq: 0, timestamp: 't', actor: systemActor, type: 'RunCreated', taskId: 't', runId: 'r', payload: {}, prevHash: null, hash: 'h0' },
      { id: 'e1', seq: 1, timestamp: 't', actor: systemActor, type: 'PlanGenerated', taskId: 't', runId: 'r', payload: { plan: [] }, prevHash: 'h0', hash: 'h1' },
      { id: 'e2', seq: 2, timestamp: 't', actor: systemActor, type: 'execution.completed', taskId: 't', runId: 'r', payload: {}, prevHash: 'h1', hash: 'h2' },
      { id: 'e3', seq: 3, timestamp: 't', actor: systemActor, type: 'ApprovalRequired', taskId: 't', runId: 'r', payload: {}, prevHash: 'h2', hash: 'h3' },
      { id: 'e4', seq: 4, timestamp: 't', actor: systemActor, type: 'ApprovalGranted', taskId: 't', runId: 'r', payload: {}, prevHash: 'h3', hash: 'h4' },
      { id: 'e5', seq: 5, timestamp: 't', actor: systemActor, type: 'TaskCompleted', taskId: 't', runId: 'r', payload: {}, prevHash: 'h4', hash: 'h5' },
    ];
    const p = projectSystem(events);
    expect(p.runs).toEqual({ runs: 1, completed: 1, failed: 0, blocked: 0 });
    expect(p.approvals).toEqual({ required: 1, granted: 1, denied: 0 });
    expect(p.usage).toEqual({ runs: 1, modelCalls: 1, toolCalls: 1 });
  });
});

describe('Checkpoint & Evidence stores', () => {
  it('persists and reloads checkpoints', async () => {
    const path = join(tempDir(), 'cp.db');
    const store = new SqliteCheckpointStore(path);
    await store.save({ id: 'cp1', label: 'pre-deploy', kind: 'deployment', state: { v: '1.2.3' }, hash: 'abc', createdAt: 't' });
    const cp = await store.get('cp1');
    expect(cp?.hash).toBe('abc');
    expect(cp?.state).toEqual({ v: '1.2.3' });
    expect(await store.list()).toHaveLength(1);
    await store.close();
  });

  it('persists and reloads evidence', async () => {
    const path = join(tempDir(), 'ev.db');
    const store = new SqliteEvidenceStore(path);
    await store.put({ id: 'ev1', kind: 'git_commit', hash: 'sha', payload: { sha: 'sha' }, createdAt: 't' });
    expect((await store.get('ev1'))?.kind).toBe('git_commit');
    await store.close();
  });
});

describe('SqliteProjectionStore — materialized snapshot', () => {
  it('saves and loads snapshots', async () => {
    const path = join(tempDir(), 'proj.db');
    const store = new SqliteProjectionStore<{ n: number }>(path);
    await store.save('usage', { n: 7 });
    expect(await store.load('usage')).toEqual({ n: 7 });
    expect(await store.load('missing')).toBeUndefined();
    await store.close();
  });
});

describe('PostgresEventStore — production adapter behind SqlDriver', () => {
  /** Fake driver داخل الذاكرة يحاكي عقد `pg` (rows/params) دون تثبيته. */
  class FakeDriver implements SqlDriver {
    rows: Record<string, unknown>[] = [];
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      if (/CREATE TABLE|BEGIN|COMMIT|ROLLBACK/.test(sql)) return [];
      if (/SELECT \* FROM events/.test(sql)) return this.rows.map((r) => ({ ...r }) as T);
      if (/COALESCE\(MAX\(seq\)/.test(sql)) return [{ last: this.rows.length ? this.rows.length - 1 : -1 } as T];
      if (/DELETE FROM events/.test(sql)) {
        this.rows = [];
        return [];
      }
      void params;
      return [];
    }
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      if (/INSERT INTO events/.test(sql)) {
        const [seq, id, type, task_id, run_id, actor_type, actor_id, payload, evidence, prev_hash, hash, timestamp] = params as unknown[];
        this.rows.push({ seq, id, type, task_id, run_id, actor_type, actor_id, payload: JSON.parse(payload as string), evidence: evidence ? JSON.parse(evidence as string) : null, prev_hash, hash, timestamp });
      }
      if (/CREATE TABLE/.test(sql)) return;
      if (/DELETE FROM events/.test(sql)) this.rows = [];
    }
    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      return fn();
    }
  }

  it('round-trips events through the driver contract', async () => {
    const driver = new FakeDriver();
    const store = new PostgresEventStore(driver);
    await store.init();
    await store.append([
      { id: 'e0', seq: 0, timestamp: 't', actor: systemActor, type: 'RunCreated', taskId: 't', runId: 'r', payload: { intent: 'x' }, prevHash: null, hash: 'h0' },
    ]);
    const events = await store.all();
    expect(events).toHaveLength(1);
    expect(events[0]!.payload).toEqual({ intent: 'x' });
    expect(await store.lastSeq()).toBe(1);
    await store.clear();
    expect(await store.all()).toHaveLength(0);
  });
});
