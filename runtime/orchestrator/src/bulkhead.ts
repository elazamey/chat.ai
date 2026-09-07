import type { BulkheadLimits } from './types';
import { DEFAULT_BULKHEAD } from './types';

/**
 * M4.8 — Bulkhead (Parallel مع حدود، لا انفجار):
 *   maxConcurrentJobs · maxConcurrentPerAgent · maxConcurrentPerTenant · maxConcurrentPerTool
 *
 * يمنع: 10 agents × 20 tools × retries = كارثة.
 * يرتبط مباشرة بـImmune System وCost Guard (يُحقن حارس الفشل/الـquota عبر الـDagExecutor).
 */
export interface BulkheadSlot {
  id: string;
  agentId?: string;
  tenantId?: string;
  toolId?: string;
}

export class ConcurrencyLimiter {
  private running = new Set<string>();
  private byAgent = new Map<string, number>();
  private byTenant = new Map<string, number>();
  private byTool = new Map<string, number>();

  constructor(private limits: BulkheadLimits = DEFAULT_BULKHEAD) {}

  get active(): number {
    return this.running.size;
  }

  tryAcquire(slot: BulkheadSlot): boolean {
    if (this.running.size >= this.limits.maxConcurrentJobs) return false;
    if (slot.agentId && (this.byAgent.get(slot.agentId) ?? 0) >= this.limits.maxConcurrentPerAgent) return false;
    if (slot.tenantId && (this.byTenant.get(slot.tenantId) ?? 0) >= this.limits.maxConcurrentPerTenant) return false;
    if (slot.toolId && (this.byTool.get(slot.toolId) ?? 0) >= this.limits.maxConcurrentPerTool) return false;

    this.running.add(slot.id);
    if (slot.agentId) this.byAgent.set(slot.agentId, (this.byAgent.get(slot.agentId) ?? 0) + 1);
    if (slot.tenantId) this.byTenant.set(slot.tenantId, (this.byTenant.get(slot.tenantId) ?? 0) + 1);
    if (slot.toolId) this.byTool.set(slot.toolId, (this.byTool.get(slot.toolId) ?? 0) + 1);
    return true;
  }

  release(slot: BulkheadSlot): void {
    this.running.delete(slot.id);
    if (slot.agentId) this.byAgent.set(slot.agentId, Math.max(0, (this.byAgent.get(slot.agentId) ?? 1) - 1));
    if (slot.tenantId) this.byTenant.set(slot.tenantId, Math.max(0, (this.byTenant.get(slot.tenantId) ?? 1) - 1));
    if (slot.toolId) this.byTool.set(slot.toolId, Math.max(0, (this.byTool.get(slot.toolId) ?? 1) - 1));
  }
}
