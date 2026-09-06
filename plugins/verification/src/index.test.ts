import { describe, it, expect } from 'vitest';
import { VerificationEngine, deriveVerdict } from './index';
import { actorAgent } from '@aok/contracts';
import type { VerificationCheck } from '@aok/contracts';

const check = (name: string, verdict: VerificationCheck['verdict'], withEvidence = true): VerificationCheck => ({
  id: name,
  name,
  verdict,
  evidence: withEvidence
    ? [{ evidenceId: `${name}-ev`, kind: 'test_result' }]
    : undefined,
});

describe('deriveVerdict', () => {
  it('FAILED if any check failed', () => {
    expect(deriveVerdict([check('a', 'PASSED'), check('b', 'FAILED')])).toBe('FAILED');
  });
  it('PASSED if all passed', () => {
    expect(deriveVerdict([check('a', 'PASSED'), check('b', 'PASSED')])).toBe('PASSED');
  });
  it('UNKNOWN when empty', () => {
    expect(deriveVerdict([])).toBe('UNKNOWN');
  });
  it('UNKNOWN when any pending', () => {
    expect(deriveVerdict([check('a', 'PASSED'), check('b', 'PENDING')])).toBe('UNKNOWN');
  });
});

describe('VerificationEngine', () => {
  const engine = new VerificationEngine();

  it('PASSES with evidence', () => {
    const v = engine.verify('deployment of X', [
      check('url_reachable', 'PASSED'),
      check('healthcheck', 'PASSED'),
    ]);
    expect(v.verdict).toBe('PASSED');
    expect(v.evidence.length).toBe(2);
  });

  it('does NOT PASS without evidence ("done" is forbidden — C7)', () => {
    const v = engine.verify('did the thing', [
      check('tests', 'PASSED', false),
    ]);
    expect(v.verdict).toBe('UNKNOWN');
  });

  it('FAILS when any evidence-backed check fails', () => {
    const v = engine.verify('deployment', [
      check('url_reachable', 'PASSED'),
      check('healthcheck', 'FAILED'),
    ]);
    expect(v.verdict).toBe('FAILED');
  });

  it('verifies an agent claim against checks', () => {
    const claim = {
      id: 'c1',
      statement: 'تم نشر المشروع',
      taskId: 't1',
      madeBy: actorAgent('devops'),
      at: new Date().toISOString(),
    };
    const v = engine.verifyClaim(claim, [
      check('git_commit', 'PASSED'),
      check('ci_status', 'PASSED'),
      check('health_check', 'PASSED'),
    ]);
    expect(v.verdict).toBe('PASSED');
    expect(v.target).toBe('تم نشر المشروع');
  });
});
