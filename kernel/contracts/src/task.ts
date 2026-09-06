import type { Actor } from './actor';

/** آلة حالة الـTask (C12): الانتقالات الفعلية في @aok/transition. */
export type TaskState =
  | 'PLANNED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'VERIFYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type RunState = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type NodeState =
  | 'PENDING'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED';

export type JobState = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export type NodeType =
  | 'RESEARCH'
  | 'CODE'
  | 'BROWSER'
  | 'TOOL'
  | 'REVIEW'
  | 'VERIFY'
  | 'APPROVE'
  | 'SUBTASK';

/**
 * الهرم (ADR-0006): Task → Run → Node → Job → ToolExecution.
 */

/** ما يريد المستخدم. */
export interface Task {
  id: string;
  goal: string;
  state: TaskState;
  createdBy: Actor;
  createdAt: string;
  runIds: string[];
}

/** محاولة تنفيذ واحدة للـTask (قابلة للتكرار بعد الفشل). */
export interface Run {
  id: string;
  taskId: string;
  attempt: number;
  state: RunState;
  createdBy: Actor;
  createdAt: string;
}

/** عقدة داخل الـTask Graph (DAG). */
export interface PlanNode {
  id: string;
  runId: string;
  type: NodeType;
  deps: string[]; // حواف DAG (معرفات عقد سابقة)
  agentId?: string;
  instructions: string;
  toolIds: string[]; // الأدوات المسموحة لهذه العقدة فقط
  approvalRequired: boolean;
  state: NodeState;
}

/** وحدة تشغيل واحدة داخل عقدة. */
export interface Job {
  id: string;
  nodeId: string;
  runId: string;
  toolId: string;
  state: JobState;
  inputHash: string;
}

/** التنفيذ الفعلي لأداة داخل Job (Idempotency عبر inputHash). */
export interface ToolExecution {
  id: string;
  jobId: string;
  toolId: string;
  inputHash: string;
  outputHash?: string;
  status: 'SUCCEEDED' | 'FAILED';
  result?: unknown;
  startedAt: string;
  finishedAt?: string;
}
