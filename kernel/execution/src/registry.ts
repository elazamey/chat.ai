import type { CapabilityExecutor } from './capability-executor';

export class ExecutorNotFoundError extends Error {
  constructor(action: string) {
    super(`no executor registered for action '${action}'`);
    this.name = 'ExecutorNotFoundError';
  }
}

/** سجل المنفّذين: action → CapabilityExecutor. */
export class ExecutorRegistry {
  private executors = new Map<string, CapabilityExecutor>();

  register(action: string, executor: CapabilityExecutor): void {
    if (this.executors.has(action)) {
      throw new Error(`executor for '${action}' is already registered`);
    }
    this.executors.set(action, executor);
  }

  resolve(action: string): CapabilityExecutor {
    const e = this.executors.get(action);
    if (!e) throw new ExecutorNotFoundError(action);
    return e;
  }

  list(): string[] {
    return [...this.executors.keys()];
  }
}
