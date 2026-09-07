import { describe, it, expect } from 'vitest';
import {
  createExecutionContext,
  CapabilityRequiredError,
  ExecutorRegistry,
  ExecutorNotFoundError,
  execute,
} from './index';
import type { ExecutionContext, CapabilityExecutor } from './index';
import type { Result } from '@aok/contracts';

const repoRead = { id: 'c1', action: 'repo.read', scope: '*', constraints: [] };

const okExecutor: CapabilityExecutor = {
  canExecute: async () => true,
  execute: async (input) => ({
    status: 'success',
    output: { read: (input as { path: string }).path },
    evidence: [{ evidenceId: 'e1', kind: 'file' }],
  }),
};

describe('unified execute() primitive', () => {
  const ctx = (caps = [repoRead]) =>
    createExecutionContext({ runId: 'r1', actorId: 'coder', capabilities: caps });

  it('executes a granted action and emits a trace of events', async () => {
    const events: Awaited<ReturnType<ExecutionContext['emit']>>[] = [];
    const c = createExecutionContext({
      runId: 'r1',
      actorId: 'coder',
      capabilities: [repoRead],
      emit: async (e) => {
        const ev = { id: 'x', timestamp: 1, ...e };
        events.push(ev);
        return ev;
      },
    });
    const registry = new ExecutorRegistry();
    registry.register('repo.read', okExecutor);

    const result = await execute('repo.read', { path: '/a.txt' }, c, registry);

    expect(result.status).toBe('success');
    expect(events.map((e) => e.type)).toEqual(['execution.requested', 'execution.completed']);
  });

  it('denies an un-granted action and records a denial event', async () => {
    const events: { type: string }[] = [];
    const c = createExecutionContext({
      runId: 'r1',
      actorId: 'coder',
      capabilities: [repoRead],
      emit: async (e) => {
        events.push({ type: e.type });
        return { id: 'x', timestamp: 1, ...e };
      },
    });
    const registry = new ExecutorRegistry();
    registry.register('repo.write', okExecutor);

    const result = await execute('repo.write', {}, c, registry);
    expect(result.status).toBe('failure');
    expect(events.map((e) => e.type)).toEqual(['execution.denied']);
  });

  it('fails when the executor refuses (canExecute=false)', async () => {
    const registry = new ExecutorRegistry();
    registry.register('repo.read', { canExecute: async () => false, execute: async () => ({ status: 'success', output: {}, evidence: [] }) });
    const result = await execute('repo.read', {}, ctx(), registry);
    expect(result.status).toBe('failure');
  });

  it('honors a custom policy context', async () => {
    const registry = new ExecutorRegistry();
    registry.register('repo.read', okExecutor);
    const c = createExecutionContext({
      runId: 'r1',
      actorId: 'coder',
      capabilities: [repoRead],
      policy: { evaluate: () => ({ allowed: false, approvalRequired: true, reason: 'needs approval' }) },
    });
    const result = await execute('repo.read', {}, c, registry);
    expect(result.status).toBe('failure');
    expect((result.output as { error: string }).error).toBe('needs approval');
  });

  it('throws ExecutorNotFoundError for an action with no registered executor', async () => {
    // القدرة ممنوحة، لذا يمرّ فحص السياسة ثم يفشل عند غياب المنفّذ
    const granted = { id: 'c', action: 'unknown.action', scope: '*', constraints: [] };
    const c = createExecutionContext({ runId: 'r1', actorId: 'coder', capabilities: [granted] });
    await expect(execute('unknown.action', {}, c, new ExecutorRegistry())).rejects.toThrow(
      ExecutorNotFoundError,
    );
  });
});

describe('ExecutionContext.require', () => {
  it('throws when the capability is not granted', () => {
    const c = createExecutionContext({ runId: 'r1', actorId: 'coder', capabilities: [repoRead] });
    expect(() => c.require('repo.write')).toThrow(CapabilityRequiredError);
    expect(() => c.require('repo.read')).not.toThrow();
  });
});

describe('Result carries evidence (proof-carrying execution)', () => {
  it('a successful result exposes its evidence', async () => {
    const registry = new ExecutorRegistry();
    registry.register('repo.read', okExecutor);
    const c = createExecutionContext({ runId: 'r1', actorId: 'coder', capabilities: [repoRead] });
    const result: Result = await execute('repo.read', { path: '/a.txt' }, c, registry);
    expect(result.status).toBe('success');
    expect(result.evidence).toHaveLength(1);
  });
});
