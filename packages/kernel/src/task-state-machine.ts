import { StateMachine } from './state-machine';
import type { TaskState, NodeState } from '@aok/contracts';

export type TaskEvent =
  | 'START'
  | 'REQUIRE_APPROVAL'
  | 'APPROVE'
  | 'REJECT'
  | 'PAUSE'
  | 'RESUME'
  | 'START_VERIFY'
  | 'VERIFY_PASS'
  | 'VERIFY_FAIL'
  | 'COMPLETE'
  | 'FAIL'
  | 'CANCEL';

/**
 * آلة حالة الـTask.
 * ملاحظة: لا يوجد PLANNED → COMPLETED مباشرة (ممنوع — C12).
 * الإكمال يمر عبر RUNNING → VERIFYING → COMPLETED (أو RUNNING → COMPLETED للحالات غير القابلة للتحقق).
 */
export const taskStateMachine = new StateMachine<TaskState, TaskEvent>({
  PLANNED: { START: 'RUNNING', CANCEL: 'CANCELLED' },
  RUNNING: {
    REQUIRE_APPROVAL: 'WAITING_APPROVAL',
    START_VERIFY: 'VERIFYING',
    PAUSE: 'PAUSED',
    COMPLETE: 'COMPLETED',
    FAIL: 'FAILED',
  },
  WAITING_APPROVAL: { APPROVE: 'RUNNING', REJECT: 'CANCELLED', FAIL: 'FAILED' },
  VERIFYING: { VERIFY_PASS: 'COMPLETED', VERIFY_FAIL: 'FAILED' },
  PAUSED: { RESUME: 'RUNNING', CANCEL: 'CANCELLED' },
  COMPLETED: {},
  FAILED: {},
  CANCELLED: {},
});

export type NodeEvent =
  | 'SCHEDULE'
  | 'START'
  | 'REQUIRE_APPROVAL'
  | 'APPROVE'
  | 'SUCCEED'
  | 'FAIL'
  | 'RETRY'
  | 'SKIP';

export const nodeStateMachine = new StateMachine<NodeState, NodeEvent>({
  PENDING: { SCHEDULE: 'SCHEDULED', SKIP: 'SKIPPED' },
  SCHEDULED: { START: 'RUNNING' },
  RUNNING: { REQUIRE_APPROVAL: 'WAITING_APPROVAL', SUCCEED: 'SUCCEEDED', FAIL: 'FAILED' },
  WAITING_APPROVAL: { APPROVE: 'RUNNING', FAIL: 'FAILED' },
  FAILED: { RETRY: 'SCHEDULED' },
  SUCCEEDED: {},
  SKIPPED: {},
});
