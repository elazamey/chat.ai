export interface IntegrityVerdict {
  status: 'OK' | 'INTEGRITY_BREACH';
  target: string;
  expectedHash: string;
  runtimeHash: string;
}

export interface IntegrityEntry {
  target: string;
  expectedHash: string;
}

/**
 * الـIntegrity Guardian (IMMUNE §18):
 * يراقب kernel/contracts/policy/ownership/plugins/release/runner.
 *   expected hash ≠ runtime hash → INTEGRITY_BREACH → quarantine + evidence.
 */
export class IntegrityGuardian {
  private expected = new Map<string, string>();

  register(target: string, expectedHash: string): void {
    this.expected.set(target, expectedHash);
  }

  registered(): IntegrityEntry[] {
    return [...this.expected.entries()].map(([target, expectedHash]) => ({ target, expectedHash }));
  }

  check(target: string, runtimeHash: string): IntegrityVerdict {
    const expectedHash = this.expected.get(target);
    if (expectedHash === undefined) {
      return { status: 'INTEGRITY_BREACH', target, expectedHash: '(unregistered)', runtimeHash };
    }
    return expectedHash === runtimeHash
      ? { status: 'OK', target, expectedHash, runtimeHash }
      : { status: 'INTEGRITY_BREACH', target, expectedHash, runtimeHash };
  }

  checkAll(runtime: Record<string, string>): IntegrityVerdict[] {
    return [...this.expected.entries()].map(([target, expectedHash]) =>
      expectedHash === runtime[target]
        ? { status: 'OK' as const, target, expectedHash, runtimeHash: runtime[target] ?? '' }
        : {
            status: 'INTEGRITY_BREACH' as const,
            target,
            expectedHash,
            runtimeHash: runtime[target] ?? '(missing)',
          },
    );
  }

  breaches(verdicts: IntegrityVerdict[]): IntegrityVerdict[] {
    return verdicts.filter((v) => v.status === 'INTEGRITY_BREACH');
  }
}
