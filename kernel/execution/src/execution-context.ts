import type { CapabilitySpec, Event, Verification } from '@aok/contracts';

export interface Workspace {
  root: string;
}

/** واجهة تقييم السياسة داخل سياق التنفيذ (يُربَط بـPolicyEngine عبر adapter). */
export interface PolicyContext {
  evaluate(action: string, scope?: string): {
    allowed: boolean;
    approvalRequired: boolean;
    reason: string;
  };
}

/**
 * سياق التنفيذ الموحّد — آلة النظام الفيزيائية.
 * كل الفروع تتفرع منه، وكل أثر جانبي يمر عبر emit().
 */
export interface ExecutionContext {
  runId: string;
  actorId: string;
  parentId?: string;
  capabilities: CapabilitySpec[];
  workspace: Workspace;
  policy: PolicyContext;
  emit(event: Omit<Event, 'id' | 'timestamp'>): Promise<Event>;
  require(capability: string): void;
  verify(input: unknown): Promise<Verification>;
}

export class CapabilityRequiredError extends Error {
  constructor(capability: string) {
    super(`capability '${capability}' is required but not granted to this actor`);
    this.name = 'CapabilityRequiredError';
  }
}

export interface CreateContextOptions {
  runId: string;
  actorId: string;
  parentId?: string;
  capabilities?: CapabilitySpec[];
  workspaceRoot?: string;
  policy?: PolicyContext;
  verify?: (input: unknown) => Promise<Verification>;
  emit?: (event: Omit<Event, 'id' | 'timestamp'>) => Promise<Event>;
}

/** يُنشئ سياق تنفيذ بافتراضات آمنة (deny-by-default) قابلة للتجاوز في الاختبارات. */
export function createExecutionContext(opts: CreateContextOptions): ExecutionContext {
  const capabilities = opts.capabilities ?? [];

  const defaultPolicy: PolicyContext = {
    evaluate(action) {
      const granted = capabilities.some((c) => c.action === action);
      return granted
        ? { allowed: true, approvalRequired: false, reason: 'granted by capabilities' }
        : { allowed: false, approvalRequired: false, reason: `'${action}' is not granted` };
    },
  };

  const defaultEmit = async (e: Omit<Event, 'id' | 'timestamp'>): Promise<Event> => {
    const event: Event = { id: crypto.randomUUID(), timestamp: Date.now(), ...e };
    return event;
  };

  const defaultVerify = async (): Promise<Verification> => ({
    id: crypto.randomUUID(),
    target: 'unverified',
    checks: [],
    evidence: [],
    verdict: 'UNKNOWN',
  });

  const ctx: ExecutionContext = {
    runId: opts.runId,
    actorId: opts.actorId,
    parentId: opts.parentId,
    capabilities,
    workspace: { root: opts.workspaceRoot ?? '/workspace' },
    policy: opts.policy ?? defaultPolicy,
    emit: opts.emit ?? defaultEmit,
    verify: opts.verify ?? defaultVerify,
    require(capability: string): void {
      if (!capabilities.some((c) => c.action === capability)) {
        throw new CapabilityRequiredError(capability);
      }
    },
  };
  return ctx;
}
