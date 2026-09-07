import { describe, it, expect } from 'vitest';
import {
  Projection,
  InMemoryEventStore,
  runReducer,
  initialRunState,
  taskReducer,
  initialTaskState,
} from './index';
import type { Event } from '@aok/contracts';

const ev = (type: string, over: Partial<Event> = {}): Event => ({
  id: 'e',
  type,
  entityId: 'run-1',
  actorId: 'coder',
  timestamp: 1,
  payload: {},
  ...over,
});

describe('projections (state = replay(events))', () => {
  it('reconstructs a Run state view from its event stream', () => {
    const events = [
      ev('run.created'),
      ev('node.completed'),
      ev('node.completed'),
      ev('node.completed'),
      ev('run.completed'),
    ];
    const view = new Projection(runReducer, initialRunState).fold(events);
    expect(view).toEqual({ status: 'COMPLETED', step: 3 });
  });

  it('is deterministic: same events → same state', () => {
    const events = [ev('run.created'), ev('node.completed'), ev('run.failed')];
    const p = new Projection(runReducer, initialRunState);
    expect(p.fold(events)).toEqual(p.fold(events));
  });

  it('reconstructs a Task state view', () => {
    const events = [ev('task.created'), ev('task.started'), ev('task.completed')];
    expect(new Projection(taskReducer, initialTaskState).fold(events).state).toBe('COMPLETED');
  });

  it('an empty stream yields the initial state', () => {
    expect(new Projection(runReducer, initialRunState).fold([])).toEqual(initialRunState);
  });
});

describe('InMemoryEventStore', () => {
  it('appends and replays events in order', () => {
    const store = new InMemoryEventStore();
    store.append([ev('run.created'), ev('run.completed')]);
    expect(store.all().map((e) => e.type)).toEqual(['run.created', 'run.completed']);
  });
});
