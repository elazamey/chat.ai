import { describe, expect, it } from 'vitest';
import {
  createUnavailablePlan,
  initialAgentState,
  transitionAgentState,
  transitionPlanStep,
} from './agent-state';

describe('agent state model', () => {
  it('starts idle without runtime metadata', () => {
    expect(initialAgentState).toEqual({ state: 'idle' });
  });

  it('moves from idle to planning before a request is sent', () => {
    expect(transitionAgentState(initialAgentState, { type: 'planning' })).toEqual({
      state: 'planning',
    });
  });

  it('moves to running when execution begins', () => {
    expect(transitionAgentState(
      { state: 'planning' },
      { type: 'run.started', runId: 'run-1' },
    )).toEqual({ state: 'running', runId: 'run-1' });
  });

  it('completes a successful run with its backend run id', () => {
    expect(transitionAgentState(
      { state: 'running' },
      { type: 'run.completed', runId: 'run-1', verdict: 'PASSED' },
    )).toEqual({ state: 'completed', runId: 'run-1' });
  });

  it('marks a non-passing backend verdict as failed', () => {
    expect(transitionAgentState(
      { state: 'running', runId: 'run-1' },
      { type: 'run.completed', runId: 'run-1', verdict: 'FAILED' },
    )).toEqual({ state: 'failed', runId: 'run-1' });
  });

  it('preserves a useful error for a failed request', () => {
    expect(transitionAgentState(
      { state: 'running', runId: 'run-1' },
      { type: 'run.failed', error: 'network unavailable' },
    )).toEqual({ state: 'failed', error: 'network unavailable' });
  });

  it('supports a cancelled state only as an explicit state event', () => {
    expect(transitionAgentState(
      { state: 'running', runId: 'run-1' },
      { type: 'run.cancelled' },
    )).toEqual({ state: 'cancelled', runId: 'run-1' });
  });
});

describe('plan state model', () => {
  it('transitions a plan step without creating runtime evidence', () => {
    const step = {
      id: 'step-1',
      title: 'Validate',
      status: 'pending' as const,
    };

    expect(transitionPlanStep(step, 'running')).toEqual({ ...step, status: 'running' });
    expect(transitionPlanStep(step, 'completed')).toEqual({ ...step, status: 'completed' });
  });

  it('keeps the planner explicitly unavailable when /run has no plan contract', () => {
    expect(createUnavailablePlan()).toMatchObject({
      state: 'unavailable',
      steps: [],
    });
    expect(createUnavailablePlan().note).toContain('backend');
  });
});
