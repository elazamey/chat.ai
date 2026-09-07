import { describe, it, expect } from 'vitest';
import type { EvidenceRef } from '@aok/contracts';
import { DagExecutor, CrashInjectedError } from './index';
import type { LedgerLike, LedgerEventLike, NodeHandler, NodeResult, WorkflowNode } from './types';

/**
 * M4.10 + M4.12 — Crash Recovery (وحدوي، داخل العملية):
 * kill orchestrator → restart → hydrate → reconstruct graph → resume.
 * (النسخة الكاملة مع SQLite + DurableLedger في tests/harness.)
 */

class MemLedger implements LedgerLike {
  private events: LedgerEventLike[] = [];
  append<T>(draft: { actor: { type: string; id: string }; type: string; taskId: string; runId: string; payload: T }): LedgerEventLike {
    const ev: LedgerEventLike = { type: draft.type, taskId: draft.taskId, runId: draft.runId, payload: draft.payload, seq: this.events.length };
    this.events.push(ev);
    return ev;
  }
  get all(): LedgerEventLike[] {
    return this.events;
  }
}

const ev = (id: string): EvidenceRef[] => [{ evidenceId: id, kind: 'test_result' }];

class CountingHandler implements NodeHandler {
  calls: Record<string, number> = {};
  constructor(private failFirst: (action: string, call: number) => boolean = () => false) {}
  async run(action: string, input: unknown, _node: WorkflowNode): Promise<NodeResult> {
    const call = (this.calls[action] ?? 0) + 1;
    this.calls[action] = call;
    if (this.failFirst(action, call)) {
      return { status: 'failure', output: { error: `injected failure ${action}#${call}` }, evidence: [] };
    }
    return { status: 'success', output: { value: `${action}-${input}` }, evidence: ev(action) };
  }
}

function node(id: string, actionName: string, deps: string[]): WorkflowNode {
  return { id, kind: 'ACTION', action: actionName, deps };
}

describe('crash recovery (M4.10)', () => {
  it('kill in the middle → hydrate → reconstruct graph → resume → complete, no duplicates', async () => {
    const graph: WorkflowNode[] = [
      node('A', 'a', []),
      node('B', 'b', ['A']),
      node('C', 'c', ['A']),
      node('D', 'd', ['A']),
      node('E', 'e', ['B', 'C', 'D']),
    ];

    const ledger = new MemLedger();

    // 1) تشغيل أول مع حقن قتل عند بدء C (بعد جدولتها وقبل تنفيذها).
    const handler1 = new CountingHandler();
    const crashOn = (nodeId: string, attempt: number) => {
      if (nodeId === 'C' && attempt === 1) throw new CrashInjectedError();
    };
    const exec1 = new DagExecutor(handler1, { ledger, onBeforeStart: crashOn, limits: { maxConcurrentJobs: 1, maxConcurrentPerAgent: 1, maxConcurrentPerTenant: 1, maxConcurrentPerTool: 1 }, sleep: async () => {} });
    await expect(exec1.run(graph, { taskId: 't1', runId: 'run-crash' })).rejects.toThrow(CrashInjectedError);

    // الحالة قبل القتل: A,B أكملتا (مثبّتة)، C ميتة قبل التنفيذ.
    expect(ledger.all.some((e) => e.type === 'WorkflowNodeCompleted' && (e.payload as { nodeId: string }).nodeId === 'A')).toBe(true);
    expect(handler1.calls['c'] ?? 0).toBe(0); // لم يُنفَّذ C قبل القتل

    // 2) إعادة التشغيل: hydrate من الأحداث، ثم resume.
    const handler2 = new CountingHandler();
    const exec2 = new DagExecutor(handler2, { ledger, limits: { maxConcurrentJobs: 1, maxConcurrentPerAgent: 1, maxConcurrentPerTenant: 1, maxConcurrentPerTool: 1 }, sleep: async () => {} });
    await exec2.hydrate(ledger.all);
    const out = await exec2.resume();

    expect(out.status).toBe('COMPLETED');
    expect(out.completed.sort()).toEqual(['A', 'B', 'C', 'D', 'E']);

    // لا إعادة تنفيذ للعقد المكتملة (NO lost state, NO duplicate side effect):
    expect(handler2.calls['a'] ?? 0).toBe(0);
    expect(handler2.calls['b'] ?? 0).toBe(0);
    expect(handler2.calls['c'] ?? 0).toBe(1);
    expect(handler2.calls['d'] ?? 0).toBe(1);
    expect(handler2.calls['e'] ?? 0).toBe(1);
  });

  it('duplicate delivery reuses the completed result (idempotency across restart)', async () => {
    const graph: WorkflowNode[] = [node('A', 'a', [])];
    const ledger = new MemLedger();
    const h1 = new CountingHandler();
    const exec1 = new DagExecutor(h1, { ledger, sleep: async () => {} });
    const out1 = await exec1.run(graph, { taskId: 't', runId: 'run-dup' });
    expect(out1.status).toBe('COMPLETED');

    // محاكاة إعادة تسليم (duplicate delivery) بعد إعادة التشغيل:
    const h2 = new CountingHandler();
    const exec2 = new DagExecutor(h2, { ledger, sleep: async () => {} });
    await exec2.hydrate(ledger.all);
    const out2 = await exec2.resume();
    expect(out2.status).toBe('COMPLETED');
    // لا تنفيذ جديد لأي عقدة (النتيجة أُعيد استخدامها من الـIdempotency المزروع).
    expect(Object.keys(h2.calls).length).toBe(0);
  });
});
