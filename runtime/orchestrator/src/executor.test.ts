import { describe, it, expect } from 'vitest';
import type { EvidenceRef } from '@aok/contracts';
import {
  DagExecutor,
  ConcurrencyLimiter,
  InMemoryIdempotencyStore,
  InProcessScheduler,
  backoffMs,
  isRetryable,
  nodeStateMachine,
} from './index';
import type { LedgerLike, LedgerEventLike, NodeHandler, NodeResult, WorkflowNode } from './types';

/** Ledger داخل الذاكرة (بنيويًا يطابق DurableLedger/Ledger). */
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

const evidence = (id: string): EvidenceRef[] => [{ evidenceId: id, kind: 'test_result' }];

interface Call {
  action: string;
  input: unknown;
  nodeId: string;
}

/** منفّذ قابل للبرمجة — يحاكي execute() في النواة بنتائج حتمية. */
class ScriptedHandler implements NodeHandler {
  readonly calls: Call[] = [];
  constructor(
    private script: (action: string, input: unknown, node: WorkflowNode, callIndex: number) => NodeResult,
    private opts: { approve?: boolean; approvalCalls?: string[] } = {},
  ) {}

  async run(action: string, input: unknown, node: WorkflowNode): Promise<NodeResult> {
    const callIndex = this.calls.filter((c) => c.action === action).length;
    this.calls.push({ action, input, nodeId: node.id });
    return this.script(action, input, node, callIndex);
  }

  async requestApproval(req: { action: string; nodeId: string }): Promise<boolean> {
    this.opts.approvalCalls?.push(req.action);
    return this.opts.approve ?? false;
  }
}

const ok = (output: unknown = {}): NodeResult => ({ status: 'success', output, evidence: evidence('ok') });
const fail = (error: string): NodeResult => ({ status: 'failure', output: { error }, evidence: [] });

function action(id: string, action: string, deps: string[], extra: Partial<WorkflowNode> = {}): WorkflowNode {
  return { id, kind: 'ACTION', action, deps, ...extra };
}

describe('node state machine (M4.1)', () => {
  it('enforces legal transitions and rejects illegal ones (no PLANNED→COMPLETED)', () => {
    expect(nodeStateMachine.canTransition('PLANNED', 'COMPLETE')).toBe(false);
    expect(nodeStateMachine.transition('PLANNED', 'PREPARE')).toBe('READY');
    expect(nodeStateMachine.transition('READY', 'START')).toBe('RUNNING');
    expect(nodeStateMachine.transition('RUNNING', 'VERIFY')).toBe('VERIFYING');
    expect(nodeStateMachine.transition('VERIFYING', 'COMPLETE')).toBe('COMPLETED');
    // مسار الفشل
    expect(nodeStateMachine.transition('RUNNING', 'FAIL')).toBe('FAILED');
    expect(nodeStateMachine.transition('FAILED', 'RETRY')).toBe('RETRYING');
    expect(nodeStateMachine.transition('RETRYING', 'RESUME')).toBe('RUNNING');
    expect(nodeStateMachine.transition('FAILED', 'COMPENSATE')).toBe('COMPENSATING');
    expect(nodeStateMachine.transition('COMPENSATING', 'ROLLBACK')).toBe('ROLLED_BACK');
    expect(nodeStateMachine.transition('FAILED', 'QUARANTINE')).toBe('QUARANTINED');
  });

  it('throws on illegal transition', () => {
    expect(() => nodeStateMachine.transition('COMPLETED', 'START')).toThrow();
    expect(() => nodeStateMachine.transition('PLANNED', 'COMPLETE')).toThrow();
  });
});

describe('scheduler (M4.2) — interface + in-process transport', () => {
  it('enqueue/cancel/retry are async and decouple the orchestrator from the transport', async () => {
    const s = new InProcessScheduler();
    await s.enqueue({ id: 'j1', nodeId: 'n1', runId: 'r', operationId: 'r:n1', idempotencyKey: 'k1', attempt: 1, enqueuedAt: 0 });
    await s.enqueue({ id: 'j2', nodeId: 'n2', runId: 'r', operationId: 'r:n2', idempotencyKey: 'k2', attempt: 1, enqueuedAt: 0 });
    await s.cancel('j1');
    expect(s.size).toBe(1);
    await s.retry('j2');
    expect(s.size).toBe(2);
    expect(s.dequeue()?.nodeId).toBe('n2');
  });
});

describe('retry policy (M4.4)', () => {
  it('only retries retryable errors, with exponential backoff and jitter bounds', () => {
    const policy = { maxAttempts: 3, backoff: 'exponential' as const, retryableErrors: ['timeout', 'ECONNRESET'], jitter: true };
    expect(isRetryable(policy, 'timeout after 5000ms')).toBe(true);
    expect(isRetryable(policy, 'denied by grant')).toBe(false);
    const d = backoffMs(policy, 2, () => 0.5);
    expect(d).toBe(1500); // 1000*2^(1) * (0.5 + 0.5*0.5)
    expect(backoffMs({ maxAttempts: 1, backoff: 'fixed', retryableErrors: [] }, 1)).toBe(1000);
  });
});

describe('idempotency (M4.5)', () => {
  it('reuses the result of a previous execution (no duplicate side effect)', async () => {
    const store = new InMemoryIdempotencyStore();
    let executions = 0;
    const key = 'k1';
    const first = await store.run(key, async () => {
      executions += 1;
      return ok({ n: 1 });
    });
    const second = await store.run(key, async () => {
      executions += 1;
      return ok({ n: 2 });
    });
    expect(executions).toBe(1);
    expect(second).toEqual(first);
  });
});

describe('bulkhead (M4.8)', () => {
  it('caps concurrent jobs globally and per dimension', () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrentJobs: 2, maxConcurrentPerAgent: 1, maxConcurrentPerTenant: 2, maxConcurrentPerTool: 2 });
    expect(limiter.tryAcquire({ id: 'a', agentId: 'x' })).toBe(true);
    expect(limiter.tryAcquire({ id: 'b', agentId: 'x' })).toBe(false); // per-agent 1
    expect(limiter.tryAcquire({ id: 'c', agentId: 'y' })).toBe(true); // global 2
    expect(limiter.tryAcquire({ id: 'd', agentId: 'z' })).toBe(false); // global 2
    limiter.release({ id: 'a', agentId: 'x' });
    expect(limiter.tryAcquire({ id: 'd', agentId: 'z' })).toBe(true);
  });
});

describe('DagExecutor (M4.3/6) — sequential + parallel + dependency + fan-in', () => {
  it('A → (B,C,D) → E: E waits for B/C/D; a C timeout is retried then E unlocks', async () => {
    const handler = new ScriptedHandler((actionName, _input, _node, callIndex) => {
      if (actionName === 'c' && callIndex === 0) return fail('timeout after 5000ms');
      return ok({ value: actionName });
    });

    const graph: WorkflowNode[] = [
      action('A', 'a', []),
      action('B', 'b', ['A']),
      { ...action('C', 'c', ['A']), retry: { maxAttempts: 2, backoff: 'fixed', retryableErrors: ['timeout'], jitter: false } },
      action('D', 'd', ['A']),
      { ...action('E', 'e', ['B', 'C', 'D']), input: { $ref: { nodeId: 'C', path: 'output.value' } } },
    ];

    const ledger = new MemLedger();
    const executor = new DagExecutor(handler, { ledger, limits: { maxConcurrentJobs: 4, maxConcurrentPerAgent: 4, maxConcurrentPerTenant: 4, maxConcurrentPerTool: 4 }, sleep: async () => {} });
    const outcome = await executor.run(graph, { taskId: 't1', runId: 'run-1' });

    expect(outcome.status).toBe('COMPLETED');
    expect(outcome.completed.sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
    // C فشل مرة ثم نجح (retry)
    expect(handler.calls.filter((c) => c.action === 'c').length).toBe(2);
    // E حصل على مدخل الإحالة الموثّقة من نتيجة C
    const eCall = handler.calls.find((c) => c.action === 'e');
    expect(eCall?.input).toBe('c');
    // E لا يبدأ قبل B/C/D
    const order = handler.calls.map((c) => c.action);
    expect(order.indexOf('e')).toBeGreaterThan(order.lastIndexOf('c'));
    // كل الأحداث مثبّتة
    const types = ledger.all.map((e) => e.type);
    expect(types).toContain('WorkflowRunCreated');
    expect(types).toContain('WorkflowNodeRetrying');
    expect(types).toContain('WorkflowRunCompleted');
    expect(ledger.all.filter((e) => e.type === 'WorkflowNodeCompleted').length).toBe(5);
  });
});

describe('DagExecutor — conditional (M4.7)', () => {
  it('routes on a VERIFIED verdict (success → deploy, failure → fix)', async () => {
    const makeGraph = (testsPass: boolean) => [
      { id: 'test', kind: 'CONDITIONAL' as const, action: 'test.run', deps: [], condition: { when: { nodeId: 'test', on: 'success' as const }, then: ['deploy'], else: ['fix'] } },
      action('deploy', 'deploy', ['test']),
      action('fix', 'fix', ['test']),
    ];

    const passHandler = new ScriptedHandler((a) => (a === 'test.run' ? ok({ passed: true }) : ok()));
    const out = await new DagExecutor(passHandler, { ledger: new MemLedger() }).run(makeGraph(true), { taskId: 't', runId: 'r' });
    expect(out.completed).toContain('deploy');
    expect(out.skipped).toContain('fix');
    expect(out.status).toBe('COMPLETED');

    const failHandler = new ScriptedHandler((a) => (a === 'test.run' ? fail('tests failed') : ok()));
    const out2 = await new DagExecutor(failHandler, { ledger: new MemLedger() }).run(makeGraph(false), { taskId: 't', runId: 'r2' });
    expect(out2.completed).toContain('fix');
    expect(out2.skipped).toContain('deploy');
    expect(out2.status).toBe('COMPLETED');
  });
});

describe('DagExecutor — approval node (M4.7)', () => {
  it('test → ApprovalNode → deploy: deploy runs only after approval', async () => {
    const graph: WorkflowNode[] = [
      action('test', 'test.run', []),
      { id: 'approve', kind: 'APPROVAL', deps: ['test'], approval: { action: 'deploy.staging', reason: 'manual gate' } },
      action('deploy', 'deploy', ['approve']),
    ];

    const handler = new ScriptedHandler(() => ok(), { approve: true, approvalCalls: [] });
    const out = await new DagExecutor(handler, { ledger: new MemLedger() }).run(graph, { taskId: 't', runId: 'r' });
    expect(out.status).toBe('COMPLETED');
    expect(out.completed).toContain('deploy');
    expect(handler.calls.map((c) => c.action)).toEqual(['test.run', 'deploy']);

    const denyHandler = new ScriptedHandler(() => ok(), { approve: false });
    const out2 = await new DagExecutor(denyHandler, { ledger: new MemLedger() }).run(graph, { taskId: 't', runId: 'r2' });
    expect(out2.status).toBe('FAILED');
    expect(out2.completed).not.toContain('deploy');
  });
});

describe('DagExecutor — compensation (M4.8)', () => {
  it('create resource → failure → delete created resource (forward + compensation)', async () => {
    const graph: WorkflowNode[] = [
      { ...action('deploy', 'deploy.create', []), compensation: { action: 'deploy.delete', input: { id: 'res-1' } } },
    ];
    const handler = new ScriptedHandler((a) => (a === 'deploy.create' ? fail('resource created but error') : ok()));
    const out = await new DagExecutor(handler, { ledger: new MemLedger() }).run(graph, { taskId: 't', runId: 'r' });

    expect(out.status).toBe('FAILED');
    expect(out.rolledBack).toContain('deploy');
    expect(handler.calls.some((c) => c.action === 'deploy.delete')).toBe(true);
  });

  it('irreversible action (email sent) → NO fake rollback claim', async () => {
    const graph: WorkflowNode[] = [
      { ...action('email', 'email.send', []), compensation: { irreversible: true } },
    ];
    const handler = new ScriptedHandler((a) => (a === 'email.send' ? fail('SMTP error') : ok()));
    const out = await new DagExecutor(handler, { ledger: new MemLedger() }).run(graph, { taskId: 't', runId: 'r' });

    expect(out.status).toBe('FAILED');
    expect(out.failed.map((f) => f.nodeId)).toContain('email');
    expect(out.rolledBack).not.toContain('email');
    expect(handler.calls.some((c) => c.action === 'email.rollback')).toBe(false);
  });

  it('compensates completed nodes in reverse order (undo side effects)', async () => {
    const graph: WorkflowNode[] = [
      { ...action('create', 'create.resource', []), compensation: { action: 'delete.resource', input: { id: 'res-1' } } },
      { ...action('deploy', 'deploy.app', ['create']), compensation: { action: 'deploy.rollback', input: {} } },
    ];
    const handler = new ScriptedHandler((a) => (a === 'deploy.app' ? fail('deploy exploded') : ok()));
    const out = await new DagExecutor(handler, { ledger: new MemLedger() }).run(graph, { taskId: 't', runId: 'r' });

    expect(out.status).toBe('FAILED');
    expect(out.rolledBack).toContain('deploy');
    expect(out.rolledBack).toContain('create');
    // الترتيب العكسي: تعويض العقدة الفاشلة أولًا ثم العقد المكتملة السابقة
    const compensations = handler.calls.filter((c) => c.action === 'deploy.rollback' || c.action === 'delete.resource').map((c) => c.action);
    expect(compensations).toEqual(['deploy.rollback', 'delete.resource']);
  });
});

describe('DagExecutor — cancellation (M4.9)', () => {
  it('cancels before run → nothing executes, status CANCELLED', async () => {
    const graph: WorkflowNode[] = [action('A', 'a', []), action('B', 'b', ['A'])];
    const handler = new ScriptedHandler(() => ok());
    const executor = new DagExecutor(handler, { ledger: new MemLedger() });
    executor.cancel('user aborted');
    const out = await executor.run(graph, { taskId: 't', runId: 'r' });
    expect(out.status).toBe('CANCELLED');
    expect(handler.calls.length).toBe(0);
  });
});

describe('DagExecutor — timeout + quarantine guard (M4.4 + immune)', () => {
  it('repeated failure escalates to quarantine via FailureGuard (circuit breaker → stop)', async () => {
    const handler = new ScriptedHandler((a) => (a === 'flaky' ? fail('ECONNRESET') : ok()));
    const graph: WorkflowNode[] = [
      { ...action('flaky', 'flaky', []), retry: { maxAttempts: 10, backoff: 'fixed', retryableErrors: ['ECONNRESET'], jitter: false } },
    ];
    const guard = {
      assess(nodeId: string, failures: number, _error: string) {
        // بعد 3 إخفاقات متكررة: circuit breaker → stop + quarantine
        if (failures >= 3) return { stop: true, quarantine: true, reason: `circuit breaker opened for '${nodeId}'` };
        return { stop: false, quarantine: false };
      },
    };
    const out = await new DagExecutor(handler, { ledger: new MemLedger(), failureGuard: guard, sleep: async () => {} }).run(graph, { taskId: 't', runId: 'r' });
    expect(out.status).toBe('QUARANTINED');
    expect(out.quarantined).toContain('flaky');
    expect(handler.calls.filter((c) => c.action === 'flaky').length).toBe(3);
  });
});
