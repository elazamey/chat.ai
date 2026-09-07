import type { Actor } from './actor';

/** كتالوج الأحداث (C5): كل فعل في النظام Event. */
export const EVENT_TYPES = [
  'RunCreated',
  'TaskCreated',
  'PlanGenerated',
  'NodeStarted',
  'ToolRequested',
  'ApprovalRequired',
  'ApprovalGranted',
  'ApprovalDenied',
  'ToolExecuted',
  'ArtifactCreated',
  'CommitCreated',
  'DeploymentStarted',
  'VerificationStarted',
  'VerificationPassed',
  'VerificationFailed',
  'TaskCompleted',
  'TaskFailed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EvidenceRef {
  evidenceId: string;
  kind: string; // git_commit | ci_status | http_check | test_result | file | log | screenshot | artifact
}

/** المظروف الموحّد لكل حدث في الـLedger. */
export interface LedgerEvent<T = unknown> {
  id: string;
  seq: number; // رقم تسلسلي رتيب داخل الـLedger
  timestamp: string; // ISO-8601
  actor: Actor;
  type: string; // مفتوح (ontology-neutral): EVENT_TYPES كتالوج مرجعي وليس قيدًا
  taskId: string;
  runId: string;
  payload: T;
  evidence?: EvidenceRef[];
  prevHash: string | null; // null للحدث الأول
  hash: string; // = hash(payload + prevHash) — سلسلة كاشفة للعبث (C6)
}

/** ما يُقدَّم للـLedger؛ seq/timestamp/hash تُحسب تلقائيًا. */
export interface LedgerEventDraft<T = unknown> {
  actor: Actor;
  type: string;
  taskId: string;
  runId: string;
  payload: T;
  evidence?: EvidenceRef[];
}
