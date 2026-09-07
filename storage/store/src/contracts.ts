import type { LedgerEvent } from '@aok/contracts';

/**
 * عقود التخزين الدائم (M3 — Durable State + Event Store):
 *   Event Store · Projection Store · Checkpoint Store · Evidence Store
 *
 * الواجهات async (مستقبل Postgres)، والتطبيقات:
 *   - SQLite (dev/test) — عبر node:sqlite
 *   - Postgres (إنتاج) — عبر SqlDriver (يُربَط بـ pg عند النشر)
 *
 * المبدأ (ADR-0004/0018): الأحداث هي الحقيقة، والحالة = replay(events).
 */

export interface EventStore {
  /** إلحاق أحداث (append-only) بشكل ذرّي. */
  append(events: LedgerEvent[]): Promise<void>;
  /** كل الأحداث بترتيب الإدراج. */
  all(): Promise<LedgerEvent[]>;
  /** آخر رقم تسلسلي (0 إن كان فارغًا). */
  lastSeq(): Promise<number>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

/** عرض مادي (Projection) قابل للحفظ والاستعادة. */
export interface ProjectionStore<S> {
  save(name: string, state: S): Promise<void>;
  load(name: string): Promise<S | undefined>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

export interface CheckpointRecord {
  id: string;
  label: string;
  kind: string;
  state: Record<string, unknown>;
  hash: string;
  createdAt: string;
}

export interface CheckpointStore {
  save(checkpoint: CheckpointRecord): Promise<void>;
  get(id: string): Promise<CheckpointRecord | undefined>;
  list(): Promise<CheckpointRecord[]>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

export interface EvidenceRecord {
  id: string;
  kind: string;
  hash: string;
  payload: unknown;
  createdAt: string;
}

export interface EvidenceStore {
  put(evidence: EvidenceRecord): Promise<void>;
  get(id: string): Promise<EvidenceRecord | undefined>;
  list(): Promise<EvidenceRecord[]>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
