import type { LedgerEvent } from '@aok/contracts';

/**
 * Projections (M3 — الحالة = replay(events)):
 * runs / tasks / approvals / usage تُشتق من أحداث الـRunner الفعلية.
 */

export type Reducer<S> = (state: S, event: LedgerEvent) => S;

export function fold<S>(events: LedgerEvent[], reducer: Reducer<S>, initial: S): S {
  return events.reduce(reducer, initial);
}

export interface RunProjection {
  runs: number;
  completed: number;
  failed: number;
  blocked: number;
}

export const initialRunProjection: RunProjection = { runs: 0, completed: 0, failed: 0, blocked: 0 };

export const runProjectionReducer: Reducer<RunProjection> = (s, e) => {
  switch (e.type) {
    case 'RunCreated':
      return { ...s, runs: s.runs + 1 };
    case 'TaskCompleted':
      return { ...s, completed: s.completed + 1 };
    case 'TaskFailed':
      return { ...s, failed: s.failed + 1 };
    case 'ImmuneBlocked':
      return { ...s, blocked: s.blocked + 1 };
    default:
      return s;
  }
};

export interface ApprovalProjection {
  required: number;
  granted: number;
  denied: number;
}

export const initialApprovalProjection: ApprovalProjection = { required: 0, granted: 0, denied: 0 };

export const approvalProjectionReducer: Reducer<ApprovalProjection> = (s, e) => {
  switch (e.type) {
    case 'ApprovalRequired':
      return { ...s, required: s.required + 1 };
    case 'ApprovalGranted':
      return { ...s, granted: s.granted + 1 };
    case 'ApprovalDenied':
      return { ...s, denied: s.denied + 1 };
    default:
      return s;
  }
};

export interface UsageProjection {
  runs: number;
  modelCalls: number;
  toolCalls: number;
}

export const initialUsageProjection: UsageProjection = { runs: 0, modelCalls: 0, toolCalls: 0 };

export const usageProjectionReducer: Reducer<UsageProjection> = (s, e) => {
  switch (e.type) {
    case 'RunCreated':
      return { ...s, runs: s.runs + 1 };
    case 'PlanGenerated':
      return { ...s, modelCalls: s.modelCalls + 1 };
    case 'execution.completed':
      return { ...s, toolCalls: s.toolCalls + 1 };
    default:
      return s;
  }
};

export interface SystemProjection {
  runs: RunProjection;
  approvals: ApprovalProjection;
  usage: UsageProjection;
}

export const initialSystemProjection: SystemProjection = {
  runs: initialRunProjection,
  approvals: initialApprovalProjection,
  usage: initialUsageProjection,
};

/** يبني كل الإسقاطات من الأحداث (إعادة بناء كاملة بعد restart). */
export function projectSystem(events: LedgerEvent[]): SystemProjection {
  return {
    runs: fold(events, runProjectionReducer, initialRunProjection),
    approvals: fold(events, approvalProjectionReducer, initialApprovalProjection),
    usage: fold(events, usageProjectionReducer, initialUsageProjection),
  };
}
