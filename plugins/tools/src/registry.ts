import type { ToolContract, ToolHandler, ToolExecutionContext } from '@aok/contracts';

export class ToolNotFoundError extends Error {
  constructor(id: string) {
    super(`tool '${id}' is not registered`);
    this.name = 'ToolNotFoundError';
  }
}

export interface RegisteredTool {
  contract: ToolContract;
  handler: ToolHandler;
}

/**
 * سجل الأدوات الديناميكي (C14): قلب قدرات النظام.
 * لا تنفيذ بدون عقد: المدخلات والمخرجات تمر عبر الـschema الإجباري.
 */
export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(contract: ToolContract, handler: ToolHandler): void {
    if (this.tools.has(contract.id)) {
      throw new Error(`tool '${contract.id}' is already registered`);
    }
    this.tools.set(contract.id, { contract, handler });
  }

  unregister(id: string): void {
    this.tools.delete(id);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  get(id: string): RegisteredTool {
    const t = this.tools.get(id);
    if (!t) throw new ToolNotFoundError(id);
    return t;
  }

  list(): ToolContract[] {
    return [...this.tools.values()].map((t) => t.contract);
  }

  /** استدعاء أداة مع فرض عقديها (input/output) — INV: لا تنفيذ بدون عقد. */
  async invoke(id: string, input: unknown, ctx: ToolExecutionContext): Promise<{ output: unknown }> {
    const { contract, handler } = this.get(id);
    const parsedInput = contract.inputSchema.parse(input);
    const output = await handler(parsedInput, ctx);
    const parsedOutput = contract.outputSchema.parse(output);
    return { output: parsedOutput };
  }
}
