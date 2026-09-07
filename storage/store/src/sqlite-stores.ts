import { DatabaseSync } from './sqlite';
import type { LedgerEvent } from '@aok/contracts';
import type {
  CheckpointRecord,
  CheckpointStore,
  EvidenceRecord,
  EvidenceStore,
  EventStore,
  ProjectionStore,
} from './contracts';

interface EventRow {
  seq: number;
  id: string;
  type: string;
  task_id: string;
  run_id: string;
  actor_type: string;
  actor_id: string;
  payload: string;
  evidence: string | null;
  prev_hash: string | null;
  hash: string;
  timestamp: string;
}

function rowToEvent(r: EventRow): LedgerEvent {
  return {
    id: r.id,
    seq: r.seq,
    timestamp: r.timestamp,
    actor: { type: r.actor_type as LedgerEvent['actor']['type'], id: r.actor_id },
    type: r.type,
    taskId: r.task_id,
    runId: r.run_id,
    payload: JSON.parse(r.payload) as unknown,
    evidence: r.evidence === null ? undefined : (JSON.parse(r.evidence) as LedgerEvent['evidence']),
    prevHash: r.prev_hash,
    hash: r.hash,
  };
}

/**
 * Event Store على SQLite (dev/test فقط — ADR-0013):
 * الأحداث هي الحقيقة، مخزنة append-only بترتيب إدراجها،
 * مع سلسلة التجزئة (hash/prevHash) للتأكد من عدم العبث.
 */
export class SqliteEventStore implements EventStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY,
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        task_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        evidence TEXT,
        prev_hash TEXT,
        hash TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
  }

  async append(events: LedgerEvent[]): Promise<void> {
    const insert = this.db.prepare(
      `INSERT INTO events (seq, id, type, task_id, run_id, actor_type, actor_id, payload, evidence, prev_hash, hash, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    this.db.exec('BEGIN');
    try {
      for (const e of events) {
        insert.run(
          e.seq,
          e.id,
          e.type,
          e.taskId,
          e.runId,
          e.actor.type,
          e.actor.id,
          JSON.stringify(e.payload),
          e.evidence === undefined ? null : JSON.stringify(e.evidence),
          e.prevHash,
          e.hash,
          e.timestamp,
        );
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async all(): Promise<LedgerEvent[]> {
    const rows = this.db.prepare('SELECT * FROM events ORDER BY seq ASC').all() as unknown as EventRow[];
    return rows.map(rowToEvent);
  }

  async lastSeq(): Promise<number> {
    const row = this.db.prepare('SELECT COALESCE(MAX(seq), -1) AS last FROM events').get() as { last: number };
    return row.last + 1;
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM events');
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/**
 * Projection Store على SQLite: لقطة مادية (snapshot) قابلة للاستعادة —
 * تُشتق من الأحداث (replay)، واللقطة تسرّع الإقلاع فقط وليست الحقيقة.
 */
export class SqliteProjectionStore<S> implements ProjectionStore<S> {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('CREATE TABLE IF NOT EXISTS projections (name TEXT PRIMARY KEY, state TEXT NOT NULL)');
  }

  async save(name: string, state: S): Promise<void> {
    this.db
      .prepare('INSERT INTO projections (name, state) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET state = excluded.state')
      .run(name, JSON.stringify(state));
  }

  async load(name: string): Promise<S | undefined> {
    const row = this.db.prepare('SELECT state FROM projections WHERE name = ?').get(name) as { state: string } | undefined;
    return row ? (JSON.parse(row.state) as S) : undefined;
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM projections');
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/** Checkpoint Store على SQLite: لقطات known-good قبل العمليات الحساسة. */
export class SqliteCheckpointStore implements CheckpointStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, label TEXT NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL)',
    );
  }

  async save(c: CheckpointRecord): Promise<void> {
    this.db
      .prepare('INSERT INTO checkpoints (id, label, kind, state, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(c.id, c.label, c.kind, JSON.stringify(c.state), c.hash, c.createdAt);
  }

  async get(id: string): Promise<CheckpointRecord | undefined> {
    const r = this.db
      .prepare('SELECT id, label, kind, state, hash, created_at FROM checkpoints WHERE id = ?')
      .get(id) as { id: string; label: string; kind: string; state: string; hash: string; created_at: string } | undefined;
    return r ? { id: r.id, label: r.label, kind: r.kind, state: JSON.parse(r.state) as Record<string, unknown>, hash: r.hash, createdAt: r.created_at } : undefined;
  }

  async list(): Promise<CheckpointRecord[]> {
    const rows = this.db
      .prepare('SELECT id, label, kind, state, hash, created_at FROM checkpoints ORDER BY created_at ASC')
      .all() as { id: string; label: string; kind: string; state: string; hash: string; created_at: string }[];
    return rows.map((r) => ({ id: r.id, label: r.label, kind: r.kind, state: JSON.parse(r.state) as Record<string, unknown>, hash: r.hash, createdAt: r.created_at }));
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM checkpoints');
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/** Evidence Store على SQLite: أدلة قابلة للتدقيق بمجزاء تجزئة. */
export class SqliteEvidenceStore implements EvidenceStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, kind TEXT NOT NULL, hash TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');
  }

  async put(e: EvidenceRecord): Promise<void> {
    this.db
      .prepare('INSERT OR REPLACE INTO evidence (id, kind, hash, payload, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(e.id, e.kind, e.hash, JSON.stringify(e.payload), e.createdAt);
  }

  async get(id: string): Promise<EvidenceRecord | undefined> {
    const r = this.db
      .prepare('SELECT id, kind, hash, payload, created_at FROM evidence WHERE id = ?')
      .get(id) as { id: string; kind: string; hash: string; payload: string; created_at: string } | undefined;
    return r ? { id: r.id, kind: r.kind, hash: r.hash, payload: JSON.parse(r.payload) as unknown, createdAt: r.created_at } : undefined;
  }

  async list(): Promise<EvidenceRecord[]> {
    const rows = this.db
      .prepare('SELECT id, kind, hash, payload, created_at FROM evidence ORDER BY created_at ASC')
      .all() as { id: string; kind: string; hash: string; payload: string; created_at: string }[];
    return rows.map((r) => ({ id: r.id, kind: r.kind, hash: r.hash, payload: JSON.parse(r.payload) as unknown, createdAt: r.created_at }));
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM evidence');
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
