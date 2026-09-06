import type { PlanNode } from '@aok/contracts';

export class DagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DagError';
  }
}

/**
 * التحقق من سلامة الـTask Graph: عقد معروفة، لا دورات (C6/DAG).
 * يرمي DagError عند أي خلل.
 */
export function validateDag(nodes: PlanNode[]): void {
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) {
    throw new DagError('duplicate node ids');
  }
  for (const node of nodes) {
    for (const dep of node.deps) {
      if (!ids.has(dep)) {
        throw new DagError(`node '${node.id}' depends on unknown node '${dep}'`);
      }
    }
  }
  if (detectCycle(nodes)) {
    throw new DagError('plan contains a cycle');
  }
}

function detectCycle(nodes: PlanNode[]): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const state = new Map<string, 'visiting' | 'visited'>();
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === 'visiting') return true;
    if (s === 'visited') return false;
    state.set(id, 'visiting');
    const node = byId.get(id);
    if (node) {
      for (const dep of node.deps) {
        if (visit(dep)) return true;
      }
    }
    state.set(id, 'visited');
    return false;
  };
  for (const n of nodes) {
    if (visit(n.id)) return true;
  }
  return false;
}

/**
 * ترتيب تنفيذ طوبولوجي على شكل طبقات (layers) للجدولة المتوازية:
 * كل طبقة تحتوي عقدًا يمكن تنفيذها معًا (لا تبعيات متبادلة داخل الطبقة).
 */
export function topologicalLayers(nodes: PlanNode[]): PlanNode[][] {
  validateDag(nodes);
  const remaining = new Map(nodes.map((n) => [n.id, n]));
  const layers: PlanNode[][] = [];
  const satisfied = new Set<string>();

  while (remaining.size > 0) {
    const layer: PlanNode[] = [];
    for (const node of remaining.values()) {
      if (node.deps.every((d) => satisfied.has(d))) {
        layer.push(node);
      }
    }
    if (layer.length === 0) {
      throw new DagError('unreachable nodes (cycle or missing dependency)');
    }
    for (const node of layer) {
      remaining.delete(node.id);
      satisfied.add(node.id);
    }
    layers.push(layer);
  }
  return layers;
}
