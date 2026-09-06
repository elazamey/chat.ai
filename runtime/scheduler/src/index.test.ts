import { describe, it, expect } from 'vitest';
import { InProcessScheduler } from './index';
import type { Job } from '@aok/contracts';

const job = (id: string): Job => ({
  id,
  nodeId: 'n',
  runId: 'r',
  toolId: 'git.commit',
  state: 'QUEUED',
  inputHash: 'h',
});

describe('InProcessScheduler', () => {
  it('dispatches FIFO', () => {
    const s = new InProcessScheduler();
    s.enqueue(job('j1'));
    s.enqueue(job('j2'));
    expect(s.size).toBe(2);
    expect(s.dequeue()?.id).toBe('j1');
    expect(s.dequeue()?.id).toBe('j2');
    expect(s.dequeue()).toBeUndefined();
  });

  it('enforces concurrency limit', () => {
    const s = new InProcessScheduler();
    expect(s.canDispatch(2, 2)).toBe(false);
    expect(s.canDispatch(2, 1)).toBe(true);
  });
});
