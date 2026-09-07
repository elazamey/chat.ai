import { describe, it, expect } from 'vitest';
import {
  StateMachine,
  IllegalTransitionError,
  taskStateMachine,
  nodeStateMachine,
  validateDag,
  topologicalLayers,
  DagError,
} from './index';
import type { PlanNode } from '@aok/contracts';

describe('StateMachine', () => {
  type S = 'A' | 'B';
  type E = 'go' | 'back';
  const sm = new StateMachine<S, E>({ A: { go: 'B' }, B: { back: 'A' } });

  it('returns the next state for a legal transition', () => {
    expect(sm.transition('A', 'go')).toBe('B');
    expect(sm.canTransition('A', 'go')).toBe(true);
  });

  it('throws IllegalTransitionError for an illegal transition', () => {
    expect(() => sm.transition('A', 'back')).toThrow(IllegalTransitionError);
    expect(sm.canTransition('A', 'back')).toBe(false);
  });
});

describe('taskStateMachine', () => {
  it('forbids PLANNED → COMPLETED (C12)', () => {
    expect(taskStateMachine.canTransition('PLANNED', 'COMPLETE')).toBe(false);
    expect(() => taskStateMachine.transition('PLANNED', 'COMPLETE')).toThrow(
      IllegalTransitionError,
    );
  });

  it('walks the happy path through VERIFYING', () => {
    let s = taskStateMachine.transition('PLANNED', 'START'); // RUNNING
    s = taskStateMachine.transition(s, 'START_VERIFY'); // VERIFYING
    s = taskStateMachine.transition(s, 'VERIFY_PASS'); // COMPLETED
    expect(s).toBe('COMPLETED');
  });

  it('supports approval and resume flows', () => {
    let s = taskStateMachine.transition('PLANNED', 'START');
    s = taskStateMachine.transition(s, 'REQUIRE_APPROVAL'); // WAITING_APPROVAL
    expect(s).toBe('WAITING_APPROVAL');
    s = taskStateMachine.transition(s, 'APPROVE'); // RUNNING
    s = taskStateMachine.transition(s, 'PAUSE'); // PAUSED
    s = taskStateMachine.transition(s, 'RESUME'); // RUNNING
    s = taskStateMachine.transition(s, 'START_VERIFY'); // VERIFYING
    s = taskStateMachine.transition(s, 'VERIFY_FAIL'); // FAILED
    expect(s).toBe('FAILED');
  });

  it('rejects from terminal states', () => {
    expect(() => taskStateMachine.transition('COMPLETED', 'START')).toThrow(IllegalTransitionError);
  });
});

describe('nodeStateMachine', () => {
  it('supports retry from FAILED', () => {
    expect(nodeStateMachine.transition('FAILED', 'RETRY')).toBe('SCHEDULED');
  });

  it('allows skipping a pending node', () => {
    expect(nodeStateMachine.transition('PENDING', 'SKIP')).toBe('SKIPPED');
  });
});

describe('DAG', () => {
  const node = (id: string, deps: string[] = []): PlanNode => ({
    id,
    runId: 'run-1',
    type: 'TOOL',
    deps,
    toolIds: [],
    approvalRequired: false,
    state: 'PENDING',
    instructions: '',
  });

  it('rejects duplicate ids', () => {
    expect(() => validateDag([node('a'), node('a')])).toThrow(DagError);
  });

  it('rejects unknown dependency', () => {
    expect(() => validateDag([node('a', ['missing']), node('b')])).toThrow(DagError);
  });

  it('rejects cycles', () => {
    const nodes = [node('a', ['c']), node('b', ['a']), node('c', ['b'])];
    expect(() => validateDag(nodes)).toThrow(/cycle/);
  });

  it('produces topological layers for parallel scheduling', () => {
    const nodes = [node('a'), node('b'), node('c', ['a', 'b']), node('d', ['c'])];
    const layers = topologicalLayers(nodes);
    const ids = layers.map((l) => l.map((n) => n.id).sort());
    expect(ids).toEqual([['a', 'b'], ['c'], ['d']]);
  });
});
