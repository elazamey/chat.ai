import type { EvidenceRef } from './events';

/**
 * البدائيات الذرية (Atomic Primitives) — دستور النواة:
 * منها تتولّد بقية النظام (Task/Agent/Tool/Workflow كلها Entity بنوعها).
 */
export type ID = string;

/** كل شيء Entity؛ الـtype هو الذي يحدد الدور: 'entity:task' | 'entity:agent' | 'entity:tool' | ... */
export interface Entity {
  id: ID;
  type: string;
  version: number;
}

/** الحدث الأدنى: كل أثر جانبي يترك حدثًا. */
export interface Event {
  id: ID;
  type: string;
  entityId: ID;
  actorId: ID;
  timestamp: number;
  payload: unknown;
}

/** قيد على قدرة (موافقة/معدل/ميزانية/وقت/منع). */
export interface Constraint {
  kind: 'approval' | 'rate-limit' | 'budget' | 'time' | 'deny';
  value: unknown;
}

/**
 * القدرة (Capability) كوحدة بناء — وليس الـAgent:
 * الفعل مفتوح (string) + نطاق + قيود.
 */
export interface CapabilitySpec {
  id: ID;
  action: string; // 'repo.write' | 'github.pull_request.create' | 'deploy.staging' | ...
  scope: string; // '*' | 'repo:elazamey/chat.ai' | '/etc/**'
  constraints: Constraint[];
}

/** نتيجة تنفيذ تحمل أدلتها — لا نجاح بدون دليل. */
export interface Result {
  status: 'success' | 'failure';
  output: unknown;
  evidence: EvidenceRef[];
}
