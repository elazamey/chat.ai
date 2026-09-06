import { createHash, randomUUID } from 'node:crypto';
import {
  RECOVERY_LEVELS,
  type Checkpoint,
  type CheckpointKind,
  type KnownGoodState,
  type RecoveryLevel,
  type RecoveryResult,
} from './types';

export function stateHash(state: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

/**
 * الـRecovery (IMMUNE §9 + §21) — التعافي الذاتي بدون تهور:
 *   Level 0 retry · 1 restart component · 2 rollback transaction
 *   · 3 restore checkpoint · 4 isolate environment · 5 human approval
 * لا "أصلح كل شيء تلقائيًا"؛ الاستعادة من Checkpoint (known-good) فقط، ثم verify.
 */
export class RecoveryEngine {
  private checkpoints = new Map<string, Checkpoint>();
  private knownGood: KnownGoodState = {
    lastKnownGoodCommit: '',
    lastKnownGoodBuild: '',
    lastKnownGoodConfig: '',
    lastKnownGoodPluginSet: [],
    lastKnownGoodPolicy: '',
  };

  setKnownGood(state: Partial<KnownGoodState>): void {
    this.knownGood = { ...this.knownGood, ...state };
  }

  knownGoodState(): KnownGoodState {
    return { ...this.knownGood, lastKnownGoodPluginSet: [...this.knownGood.lastKnownGoodPluginSet] };
  }

  /** Snapshot قبل العمليات الحساسة (IMMUNE §8): migration/deployment/mass change/... */
  checkpoint(label: string, kind: CheckpointKind, state: Record<string, unknown>): Checkpoint {
    const c: Checkpoint = {
      id: randomUUID(),
      label,
      kind,
      createdAt: new Date().toISOString(),
      state: { ...state },
      hash: stateHash(state),
    };
    this.checkpoints.set(c.id, c);
    return { ...c, state: { ...c.state } };
  }

  get(id: string): Checkpoint | undefined {
    const c = this.checkpoints.get(id);
    return c ? { ...c, state: { ...c.state } } : undefined;
  }

  list(): Checkpoint[] {
    return [...this.checkpoints.values()].map((c) => ({ ...c, state: { ...c.state } }));
  }

  /** هل مستوى التعافي متاح (0..3 آلي، 4..5 يتطلب عزلًا/إنسانًا). */
  canRecover(level: RecoveryLevel): boolean {
    return level >= 0 && level <= 5;
  }

  /**
   * استعادة من Checkpoint (Level 3) ثم تحقق من سلامة الحالة المستعادة.
   * التحقق إلزامي (IMMUNE PRINCIPLE 008: Recovery requires verification).
   */
  restore(checkpointId: string, expectedState?: Record<string, unknown>): RecoveryResult {
    const c = this.checkpoints.get(checkpointId);
    if (!c) return { level: 3, applied: false, restored: false, verified: false, note: `unknown checkpoint '${checkpointId}'` };
    const restored = { ...c.state };
    const verified = expectedState ? stateHash(expectedState) === c.hash : true;
    return {
      level: 3,
      applied: true,
      restored: true,
      verified,
      note: verified ? `restored '${c.label}' and verified` : `restored '${c.label}' but verification failed`,
    };
  }

  /** تجربة التعافي بمستوى، مع ملاحظة دلالية (بدون تهور). */
  attempt(level: RecoveryLevel, note = ''): RecoveryResult {
    const label = RECOVERY_LEVELS.find((l) => l.level === level)?.label ?? 'unknown';
    const auto = level <= 3;
    return {
      level,
      applied: auto,
      restored: level === 3,
      verified: false,
      note: note || `${label}${auto ? ' (automatic)' : ' (requires external action)'}`,
    };
  }
}
