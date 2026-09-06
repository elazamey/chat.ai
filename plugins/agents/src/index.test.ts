import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { AgentRegistry, AgentNotFoundError } from './index';
import type { AgentContract } from '@aok/contracts';

const plannerAgent: AgentContract = {
  id: 'planner',
  version: '1.0.0',
  capabilities: ['repo.read'],
  permissions: ['repo.read'],
  inputSchema: z.object({ goal: z.string() }),
  outputSchema: z.object({ plan: z.unknown() }),
  execute: async () => ({ status: 'SUCCEEDED' }),
};

describe('AgentRegistry', () => {
  it('registers, lists and resolves agents as plugins', () => {
    const r = new AgentRegistry();
    r.register(plannerAgent);
    expect(r.list().map((a) => a.id)).toEqual(['planner']);
    expect(r.resolve('planner').id).toBe('planner');
  });

  it('rejects duplicate registration', () => {
    const r = new AgentRegistry();
    r.register(plannerAgent);
    expect(() => r.register(plannerAgent)).toThrow(/already registered/);
  });

  it('throws AgentNotFoundError for unknown agents', () => {
    expect(() => new AgentRegistry().resolve('nope')).toThrow(AgentNotFoundError);
  });

  it('supports adding a new agent without touching the kernel', async () => {
    const r = new AgentRegistry();
    const coder: AgentContract = {
      id: 'coder',
      version: '1.0.0',
      capabilities: ['repo.write'],
      permissions: ['repo.write'],
      inputSchema: z.object({ task: z.string() }),
      outputSchema: z.object({ diff: z.string() }),
      execute: async () => ({ status: 'SUCCEEDED', output: { diff: '+x' } }),
    };
    r.register(coder);
    expect(r.resolve('coder').id).toBe('coder');
  });
});
