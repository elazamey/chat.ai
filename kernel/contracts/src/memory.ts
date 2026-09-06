/** تقسيم الذاكرة (C18): لا خلط بين الأنواع. */
export type MemoryKind =
  | 'working'
  | 'task'
  | 'session'
  | 'project'
  | 'user'
  | 'long_term';

export interface MemoryRecord {
  id: string;
  kind: MemoryKind;
  content: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** RAG/Knowledge مستقل عن Memory (C19) — معرفة قابلة للاسترجاع بمصدر. */
export interface KnowledgeChunk {
  id: string;
  documentId: string;
  text: string;
  source: string; // provenance: url/path/line
  score?: number;
}
