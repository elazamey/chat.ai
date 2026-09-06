import type { ZodTypeAny } from 'zod';
import { validateName, namespaceOf } from '@aok/contracts';

export class UnregisteredCapabilityError extends Error {
  constructor(name: string) {
    super(`capability '${name}' is not registered in the Schema Registry`);
    this.name = 'UnregisteredCapabilityError';
  }
}

export class InvalidNameError extends Error {
  constructor(name: string, reason: string) {
    super(`invalid name '${name}': ${reason}`);
    this.name = 'InvalidNameError';
  }
}

interface CapabilityEntry {
  name: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
}

interface EventEntry {
  type: string;
  payloadSchema: ZodTypeAny;
}

/**
 * سجل الأسماء والمخططات (Namespace + Schema Registry):
 * - كل اسم يجب أن يلتزم بالـconvention (وإلا يُرفض — لا `admin.superpower`).
 * - لا يُنفَّذ أي capability غير مسجَّل.
 * المرونة تبقى (أسماء حرة مفتوحة) لكن عبر namespaces صريحة ومخططات معلنة.
 */
export class SchemaRegistry {
  private capabilities = new Map<string, CapabilityEntry>();
  private events = new Map<string, EventEntry>();

  registerCapability(name: string, inputSchema: ZodTypeAny, outputSchema: ZodTypeAny): void {
    const check = validateName(name);
    if (!check.valid) throw new InvalidNameError(name, check.reason!);
    if (this.capabilities.has(name)) throw new Error(`capability '${name}' already registered`);
    this.capabilities.set(name, { name, inputSchema, outputSchema });
  }

  registerEvent(type: string, payloadSchema: ZodTypeAny): void {
    const check = validateName(type);
    if (!check.valid) throw new InvalidNameError(type, check.reason!);
    if (this.events.has(type)) throw new Error(`event '${type}' already registered`);
    this.events.set(type, { type, payloadSchema });
  }

  hasCapability(name: string): boolean {
    return this.capabilities.has(name);
  }

  assertCapabilityRegistered(name: string): void {
    if (!this.hasCapability(name)) throw new UnregisteredCapabilityError(name);
  }

  listCapabilities(): string[] {
    return [...this.capabilities.keys()];
  }

  /** يتحقق من المدخلات ويُعيدها مقنّنة (parsed). */
  validateCapabilityInput(name: string, input: unknown): unknown {
    const entry = this.capabilities.get(name);
    if (!entry) throw new UnregisteredCapabilityError(name);
    return entry.inputSchema.parse(input);
  }

  /** يتحقق من المخرجات ويُعيدها مقنّنة. */
  validateCapabilityOutput(name: string, output: unknown): unknown {
    const entry = this.capabilities.get(name);
    if (!entry) throw new UnregisteredCapabilityError(name);
    return entry.outputSchema.parse(output);
  }

  /** يتحقق من حمولة حدث. */
  validateEventPayload(type: string, payload: unknown): unknown {
    const entry = this.events.get(type);
    if (!entry) throw new UnregisteredCapabilityError(type);
    return entry.payloadSchema.parse(payload);
  }

  /** عرض الـnamespaces المسجّلة. */
  namespaces(): string[] {
    const set = new Set<string>();
    for (const name of this.capabilities.keys()) set.add(namespaceOf(name));
    for (const type of this.events.keys()) set.add(namespaceOf(type));
    return [...set].sort();
  }
}
