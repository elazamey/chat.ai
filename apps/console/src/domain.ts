/**
 * نماذج نطاق الواجهة (UI domain) — فصلًا عن عقد النواة (Kernel contracts).
 * الواجهة تعرض ما ينتجه الـAgent Runtime؛ ولا تملك منطق تنفيذ.
 */
export type NodeStatus = 'done' | 'active' | 'pending' | 'failed' | 'blocked';

export interface Activity {
  id: string;
  kind: 'agent' | 'tool' | 'model' | 'system' | 'user';
  text: string;
  detail?: string;
  time: string;
}

export interface WorkspaceFile {
  path: string;
  kind: 'code' | 'test' | 'config' | 'doc' | 'other';
  status: 'new' | 'modified' | 'unchanged';
}

export interface AgentNode {
  id: string;
  label: string;
  tool?: string;
  status: NodeStatus;
}

export interface AgentRun {
  id: string;
  project: string;
  goal: string;
  state: 'running' | 'needs_approval' | 'completed' | 'failed';
  nodes: AgentNode[];
  files: WorkspaceFile[];
  error?: string;
}

export type ProjectSection =
  | 'overview'
  | 'chat'
  | 'agent'
  | 'tasks'
  | 'files'
  | 'knowledge'
  | 'artifacts'
  | 'activity'
  | 'settings';

export interface ProjectState {
  id: string;
  name: string;
  repository: string;
  section: ProjectSection;
}

/** Adapter boundary for a future backend event stream; no transport is assumed yet. */
export type ExecutionEvent =
  | { type: 'run.started'; runId: string; at: number }
  | { type: 'run.completed'; runId: string; verdict: AgentRun['state']; at: number }
  | { type: 'run.failed'; runId: string; error: string; at: number }
  | { type: 'tool.called'; runId: string; tool: string; at: number }
  | { type: 'evidence.created'; runId: string; count: number; at: number };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  meta?: string;
}

export interface ProviderStatus {
  name: string;
  tier: 'Free' | 'Free tier' | 'BYOK' | 'Local';
  status: 'healthy' | 'rate_limited' | 'quota' | 'offline';
  models: string;
  last?: string;
}

export type TaskTypeHint = 'planning' | 'coding' | 'research' | 'summarization' | 'vision';
