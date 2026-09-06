import { describe, it, expect } from 'vitest';
import { Ledger, verifyChain, eventHash, merkleRoot, canonicalize } from './index';
import { systemActor, actorAgent } from '@aok/contracts';

describe('canonicalize', () => {
  it('is stable regardless of key order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('is deterministic for nested structures and arrays', () => {
    expect(canonicalize({ x: [1, { c: 3, d: 4 }, 2], y: 'z' })).toBe(
      canonicalize({ y: 'z', x: [1, { d: 4, c: 3 }, 2] }),
    );
  });
});

describe('Ledger', () => {
  it('builds a tamper-evident hash chain and verifies integrity', () => {
    const ledger = new Ledger();
    ledger.append({ actor: systemActor, type: 'RunCreated', taskId: 't', runId: 'r', payload: { a: 1 } });
    ledger.append({ actor: systemActor, type: 'TaskCreated', taskId: 't', runId: 'r', payload: { a: 2 } });
    expect(ledger.length).toBe(2);
    expect(ledger.verifyIntegrity()).toEqual({ valid: true });

    const events = ledger.all;
    expect(events[0]!.prevHash).toBeNull();
    expect(events[1]!.prevHash).toBe(events[0]!.hash);
  });

  it('detects tampering', () => {
    const ledger = new Ledger();
    ledger.append({ actor: systemActor, type: 'ToolExecuted', taskId: 't', runId: 'r', payload: { ok: true } });
    ledger.append({ actor: actorAgent('coder'), type: 'CommitCreated', taskId: 't', runId: 'r', payload: { sha: 'abc' } });

    const tampered = ledger.all;
    tampered[0] = { ...tampered[0]!, payload: { ok: false } }; // عبث

    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.index).toBe(0);
  });

  it('is append-only by design (no update/delete API)', () => {
    const ledger = new Ledger();
    // @ts-expect-error لا توجد دالة update
    expect(ledger.update).toBeUndefined();
    // @ts-expect-error لا توجد دالة delete
    expect(ledger.delete).toBeUndefined();
  });

  it('replays events in insertion order', () => {
    const ledger = new Ledger();
    ledger.append({ actor: systemActor, type: 'TaskCreated', taskId: 't', runId: 'r', payload: 1 });
    ledger.append({ actor: systemActor, type: 'PlanGenerated', taskId: 't', runId: 'r', payload: 2 });
    expect(ledger.replay().map((e) => e.seq)).toEqual([0, 1]);
  });
});

describe('eventHash & merkleRoot', () => {
  it('eventHash is deterministic', () => {
    expect(eventHash({ a: 1, b: 2 }, null)).toBe(eventHash({ b: 2, a: 1 }, null));
  });

  it('merkleRoot is stable and changes when a leaf changes', () => {
    const ledger = new Ledger();
    ledger.append({ actor: systemActor, type: 'TaskCreated', taskId: 't', runId: 'r', payload: { n: 1 } });
    ledger.append({ actor: systemActor, type: 'TaskCompleted', taskId: 't', runId: 'r', payload: { n: 2 } });
    const root1 = merkleRoot(ledger.all);

    const ledger2 = new Ledger();
    ledger2.append({ actor: systemActor, type: 'TaskCreated', taskId: 't', runId: 'r', payload: { n: 1 } });
    ledger2.append({ actor: systemActor, type: 'TaskCompleted', taskId: 't', runId: 'r', payload: { n: 3 } });
    const root2 = merkleRoot(ledger2.all);

    expect(root1).not.toBe(root2);
  });
});
