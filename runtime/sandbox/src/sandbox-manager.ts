import { randomUUID } from 'node:crypto';
import type { Sandbox, SandboxLimits, SandboxManager } from '@aok/contracts';

/**
 * Sandbox في العملية (dev/test فقط) — يُطبّق مهلة التنفيذ.
 * العزل الحقيقي (gVisor/µVM/Docker) يأتي لاحقًا عبر نفس العقد (ADR-0009).
 */
export class InProcessSandbox implements Sandbox {
  readonly id = randomUUID();
  constructor(readonly limits: SandboxLimits) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`sandbox '${this.id}' exceeded timeout ${this.limits.timeoutMs}ms`)),
          this.limits.timeoutMs,
        ),
      ),
    ]);
  }
}

export class InProcessSandboxManager implements SandboxManager {
  private active = new Map<string, Sandbox>();

  async allocate(limits: SandboxLimits): Promise<Sandbox> {
    const sb = new InProcessSandbox(limits);
    this.active.set(sb.id, sb);
    return sb;
  }

  async release(id: string): Promise<void> {
    this.active.delete(id);
  }

  activeCount(): number {
    return this.active.size;
  }
}
