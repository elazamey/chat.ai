import type { CompensationSpec, WorkflowNode } from './types';

/**
 * M4.8 — Compensation بدل Rollback الوهمي.
 *
 * ليس كل شيء قابلًا للتراجع: forward action + compensation action اختيارية.
 * عمليات مثل email sent / external API mutation / github comment تُعلَّم
 * `{ irreversible: true }` — لا ندّعي rollback ممكنًا إذا لم يكن كذلك.
 */
export class CompensationRegistry {
  private byAction = new Map<string, CompensationSpec>();

  register(action: string, compensation: CompensationSpec): void {
    this.byAction.set(action, compensation);
  }

  resolve(action: string): CompensationSpec | undefined {
    return this.byAction.get(action);
  }

  /** هل هذه العقدة غير قابلة للتراجع (irreversible)؟ */
  isIrreversible(node: WorkflowNode): boolean {
    const spec = this.compensationFor(node);
    return spec !== undefined && 'irreversible' in spec && spec.irreversible === true;
  }

  compensationFor(node: WorkflowNode): CompensationSpec | undefined {
    if (node.compensation) return node.compensation;
    if (node.action) return this.byAction.get(node.action);
    return undefined;
  }
}
