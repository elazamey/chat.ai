import { randomUUID } from 'node:crypto';
import type { KnowledgeChunk, MemoryKind, MemoryRecord } from '@aok/contracts';

/**
 * مخزن الذاكرة (C18): ذاكرة مقسّمة حسب النوع — لا خلط بينها.
 * تنفيذ في الذاكرة للـMVP؛ الاستبدال بـPostgres لاحقًا خلف نفس الواجهة.
 */
export interface MemoryStore {
  put(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord;
  query(kind?: MemoryKind): MemoryRecord[];
  get(id: string): MemoryRecord | undefined;
  delete(id: string): void;
}

export class InMemoryStore implements MemoryStore {
  private records = new Map<string, MemoryRecord>();

  put(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord {
    const full: MemoryRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...record,
    };
    this.records.set(full.id, full);
    return full;
  }

  query(kind?: MemoryKind): MemoryRecord[] {
    const all = [...this.records.values()];
    return kind ? all.filter((r) => r.kind === kind) : all;
  }

  get(id: string): MemoryRecord | undefined {
    return this.records.get(id);
  }

  delete(id: string): void {
    this.records.delete(id);
  }
}

/**
 * Knowledge/RAG مستقل عن Memory (C19):
 * معلومات قابلة للاسترجاع مع Provenance (من أين جاءت المعلومة).
 */
export interface KnowledgeStore {
  ingest(chunks: Omit<KnowledgeChunk, 'id'>[]): KnowledgeChunk[];
  search(query: string, topK?: number): KnowledgeChunk[]; // MVP: تطابق نصي بسيط؛ لاحقًا hybrid+rerank
  getSource(documentId: string): string | undefined;
}

export class InMemoryKnowledgeStore implements KnowledgeStore {
  private chunks: KnowledgeChunk[] = [];
  private sources = new Map<string, string>();

  ingest(chunks: Omit<KnowledgeChunk, 'id'>[]): KnowledgeChunk[] {
    const created = chunks.map((c) => {
      const full: KnowledgeChunk = { id: randomUUID(), ...c };
      this.sources.set(full.documentId, c.source);
      this.chunks.push(full);
      return full;
    });
    return created;
  }

  search(query: string, topK = 5): KnowledgeChunk[] {
    const q = query.toLowerCase();
    return this.chunks
      .map((c) => ({ chunk: c, score: this.score(q, c.text.toLowerCase()) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => ({ ...x.chunk, score: x.score }));
  }

  getSource(documentId: string): string | undefined {
    return this.sources.get(documentId);
  }

  private score(q: string, text: string): number {
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.reduce((acc, t) => (text.includes(t) ? acc + 1 : acc), 0);
  }
}
