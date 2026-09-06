import { describe, it, expect } from 'vitest';
import { InMemoryStore, InMemoryKnowledgeStore } from './index';

describe('InMemoryStore', () => {
  it('stores records by kind and queries them separately', () => {
    const s = new InMemoryStore();
    s.put({ kind: 'user', content: { lang: 'ar' }, metadata: {} });
    s.put({ kind: 'task', content: { goal: 'x' }, metadata: {} });
    expect(s.query('user').length).toBe(1);
    expect(s.query('task').length).toBe(1);
    expect(s.query().length).toBe(2);
  });

  it('gets and deletes records', () => {
    const s = new InMemoryStore();
    const rec = s.put({ kind: 'working', content: 1, metadata: {} });
    expect(s.get(rec.id)?.content).toBe(1);
    s.delete(rec.id);
    expect(s.get(rec.id)).toBeUndefined();
  });
});

describe('InMemoryKnowledgeStore (RAG independent of Memory)', () => {
  it('ingests chunks with provenance and answers "where did this come from?"', () => {
    const k = new InMemoryKnowledgeStore();
    k.ingest([{ documentId: 'doc1', text: 'the kernel is event-driven', source: 'docs/constitution.md' }]);
    expect(k.getSource('doc1')).toBe('docs/constitution.md');
  });

  it('searches by keyword', () => {
    const k = new InMemoryKnowledgeStore();
    k.ingest([
      { documentId: 'd1', text: 'capability based security', source: 'adr-3' },
      { documentId: 'd2', text: 'postgres is the primary database', source: 'adr-13' },
    ]);
    const res = k.search('security capability');
    expect(res[0]!.documentId).toBe('d1');
  });
});
