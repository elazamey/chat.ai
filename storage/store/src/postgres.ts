import type { LedgerEvent } from '@aok/contracts';
import type { EventStore } from './contracts';

/**
 * محرك SQL مجرد (Postgres) — يُربَط بـ `pg` عند النشر (إنتاج فقط — ADR-0013).
 * لا نثبّت `pg` الآن (Zero-Cost / offline)؛ العقد هو المهم.
 */
export interface SqlDriver {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    seq BIGINT PRIMARY KEY,
    id TEXT NOT NULL,
    type TEXT NOT NULL,
    task_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    evidence JSONB,
    prev_hash TEXT,
    hash TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`;

interface PgRow {
  seq: number | string;
  id: string;
  type: string;
  task_id: string;
  run_id: string;
  actor_type: string;
  actor_id: string;
  payload: unknown;
  evidence: unknown;
  prev_hash: string | null;
  hash: string;
  timestamp: string;
}

function rowToEvent(r: PgRow): LedgerEvent {
  return {
    id: r.id,
    seq: Number(r.seq),
    timestamp: r.timestamp,
    actor: { type: r.actor_type as LedgerEvent['actor']['type'], id: r.actor_id },
    type: r.type,
    taskId: r.task_id,
    runId: r.run_id,
    payload: r.payload,
    evidence: r.evidence === null ? undefined : (r.evidence as LedgerEvent['evidence']),
    prevHash: r.prev_hash,
    hash: r.hash,
  };
}

/**
 * Event Store على Postgres (إنتاج) — نفس عقد EventStore،
 * مع JSONB للـpayload/evidence وBIGINT للـseq.
 */
export class PostgresEventStore implements EventStore {
  private table: string;

  constructor(
    private driver: SqlDriver,
    table = 'events',
  ) {
    this.table = table;
  }

  async init(): Promise<void> {
    await this.driver.execute(SCHEMA.replaceAll('events', this.table));
  }

  async append(events: LedgerEvent[]): Promise<void> {
    await this.driver.withTransaction(async () => {
      for (const e of events) {
        await this.driver.execute(
          `INSERT INTO ${this.table} (seq, id, type, task_id, run_id, actor_type, actor_id, payload, evidence, prev_hash, hash, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
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
          ],
        );
      }
    });
  }

  async all(): Promise<LedgerEvent[]> {
    const rows = await this.driver.query<PgRow>(`SELECT * FROM ${this.table} ORDER BY seq ASC`);
    return rows.map(rowToEvent);
  }

  async lastSeq(): Promise<number> {
    const rows = await this.driver.query<{ last: string | number | null }>(
      `SELECT COALESCE(MAX(seq), -1) AS last FROM ${this.table}`,
    );
    return Number(rows[0]?.last ?? -1) + 1;
  }

  async clear(): Promise<void> {
    await this.driver.execute(`DELETE FROM ${this.table}`);
  }

  async close(): Promise<void> {
    // لا اتصال دائم يُدار هنا؛ يُدار عبر الـdriver.
  }
}
