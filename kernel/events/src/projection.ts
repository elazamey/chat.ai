import type { Event } from '@aok/contracts';

/**
 * الحالة ليست ملك الـAgent (دستور النواة §الحالة):
 *   Event Store → Reducers → Current State
 * الحالة = replay(events).
 */
export type Reducer<S> = (state: S, event: Event) => S;

export class Projection<S> {
  constructor(
    readonly reducer: Reducer<S>,
    readonly initial: S,
  ) {}

  fold(events: Event[]): S {
    return events.reduce(this.reducer, this.initial);
  }
}

/** مخزن الأحداث (الحقيقة الأصلية). */
export interface EventStore {
  append(events: Event[]): void;
  all(): Event[];
}

export class InMemoryEventStore implements EventStore {
  private events: Event[] = [];

  append(events: Event[]): void {
    this.events.push(...events);
  }

  all(): Event[] {
    return [...this.events];
  }
}

/** مثال: عرض حالة الـRun يُعاد بناؤه من الأحداث (Projection). */
export interface RunStateView {
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  step: number;
}

export const initialRunState: RunStateView = { status: 'ACTIVE', step: 0 };

export function runReducer(state: RunStateView, event: Event): RunStateView {
  switch (event.type) {
    case 'run.created':
      return { status: 'ACTIVE', step: 0 };
    case 'node.completed':
      return { ...state, step: state.step + 1 };
    case 'run.completed':
      return { ...state, status: 'COMPLETED' };
    case 'run.failed':
      return { ...state, status: 'FAILED' };
    default:
      return state;
  }
}

/** عرض المهام: حالة الـTask من الأحداث. */
export interface TaskStateView {
  state: 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export const initialTaskState: TaskStateView = { state: 'PLANNED' };

export function taskReducer(state: TaskStateView, event: Event): TaskStateView {
  switch (event.type) {
    case 'task.created':
      return { state: 'PLANNED' };
    case 'task.started':
      return { state: 'RUNNING' };
    case 'task.completed':
      return { state: 'COMPLETED' };
    case 'task.failed':
      return { state: 'FAILED' };
    default:
      return state;
  }
}
