import { StateMachine } from '@aok/transition';
import type { NodeStatus } from './types';

/**
 * آلة حالة العقدة (M4.1 — C12: آلات الحالة ككود، وليست توثيقًا).
 *
 *   PLANNED → READY → RUNNING → WAITING → VERIFYING → COMPLETED
 *   RUNNING → FAILED → RETRYING → RUNNING
 *   FAILED → COMPENSATING → ROLLED_BACK
 *   FAILED → QUARANTINED
 *
 * لا انتقالات مباشرة غير قانونية (مثل PLANNED → COMPLETED).
 * الجدول هو المصدر الوحيد للقانونية؛ أي انتقال غير موجود يرمي خطأ.
 */
export type NodeEvent =
  | 'PREPARE'
  | 'START'
  | 'WAIT'
  | 'APPROVE'
  | 'DENY'
  | 'VERIFY'
  | 'COMPLETE'
  | 'FAIL'
  | 'RETRY'
  | 'RESUME'
  | 'COMPENSATE'
  | 'ROLLBACK'
  | 'QUARANTINE'
  | 'CANCEL'
  | 'SKIP';

export const nodeStateMachine = new StateMachine<NodeStatus, NodeEvent>({
  PLANNED: { PREPARE: 'READY', CANCEL: 'CANCELLED', SKIP: 'SKIPPED' },
  READY: { START: 'RUNNING', CANCEL: 'CANCELLED' },
  RUNNING: { WAIT: 'WAITING', VERIFY: 'VERIFYING', FAIL: 'FAILED', CANCEL: 'CANCELLED' },
  WAITING: { APPROVE: 'RUNNING', DENY: 'FAILED', CANCEL: 'CANCELLED' },
  VERIFYING: { COMPLETE: 'COMPLETED', FAIL: 'FAILED' },
  FAILED: { RETRY: 'RETRYING', COMPENSATE: 'COMPENSATING', QUARANTINE: 'QUARANTINED', CANCEL: 'CANCELLED' },
  RETRYING: { RESUME: 'RUNNING' },
  COMPENSATING: { ROLLBACK: 'ROLLED_BACK' },
  COMPLETED: {},
  ROLLED_BACK: {},
  QUARANTINED: {},
  CANCELLED: {},
  SKIPPED: {},
});

/** الحالات الطرفية (تُعاد بناؤها من أحداث الـLedger عند hydrate). */
export const TERMINAL_STATUSES: readonly NodeStatus[] = [
  'COMPLETED',
  'FAILED',
  'ROLLED_BACK',
  'QUARANTINED',
  'CANCELLED',
  'SKIPPED',
];

export function isTerminal(status: NodeStatus): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}
