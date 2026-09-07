import type { AgentContract } from '@aok/contracts';

export class AgentNotFoundError extends Error {
  constructor(id: string) {
    super(`agent '${id}' is not registered`);
    this.name = 'AgentNotFoundError';
  }
}

/**
 * سجل الوكلاء (C3): الـAgent Plugin يُسجَّل هنا،
 * والـKernel لا يعرف تنفيذه — يعرف عقده فقط.
 */
export class AgentRegistry {
  private agents = new Map<string, AgentContract>();

  register(contract: AgentContract): void {
    if (this.agents.has(contract.id)) {
      throw new Error(`agent '${contract.id}' is already registered`);
    }
    this.agents.set(contract.id, contract);
  }

  unregister(id: string): void {
    this.agents.delete(id);
  }

  resolve(id: string): AgentContract {
    const a = this.agents.get(id);
    if (!a) throw new AgentNotFoundError(id);
    return a;
  }

  list(): AgentContract[] {
    return [...this.agents.values()];
  }
}
