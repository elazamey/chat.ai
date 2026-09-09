import type { AgentPlan, AgentStateModel, PlanStep, PlanStepStatus } from './domain';

export type AgentStateEvent =
  | { type: 'planning' }
  | { type: 'run.started'; runId?: string }
  | { type: 'run.completed'; runId: string; verdict: 'PASSED' | 'FAILED' | 'BLOCKED' }
  | { type: 'run.failed'; error: string }
  | { type: 'run.cancelled' };

export const initialAgentState: AgentStateModel = { state: 'idle' };

export function transitionAgentState(
  current: AgentStateModel,
  event: AgentStateEvent,
): AgentStateModel {
  switch (event.type) {
    case 'planning':
      return { state: 'planning' };
    case 'run.started':
      return { state: 'running', runId: event.runId };
    case 'run.completed':
      return {
        state: event.verdict === 'PASSED' ? 'completed' : 'failed',
        runId: event.runId,
      };
    case 'run.failed':
      return { state: 'failed', error: event.error };
    case 'run.cancelled':
      return { state: 'cancelled', runId: current.runId };
  }
}

export function transitionPlanStep(step: PlanStep, status: PlanStepStatus): PlanStep {
  return { ...step, status };
}

export function createUnavailablePlan(): AgentPlan {
  return {
    id: 'pending-backend-plan',
    title: 'خطة التنفيذ',
    state: 'unavailable',
    steps: [],
    note: 'دعم الخطة من backend غير متاح في عقد /run الحالي.',
  };
}
