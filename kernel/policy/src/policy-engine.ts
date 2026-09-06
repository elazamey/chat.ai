import type { Capability, Grant, PolicyDecision, ApprovalPolicy } from '@aok/contracts';
import { DEFAULT_APPROVAL_POLICY } from '@aok/contracts';

/**
 * مطابقة نطاق المورد:
 * - '*' = الكل
 * - 'repo:x' = تطابق تام
 * - 'domain:*' = بادئة
 * - '/etc/**' = كل ما تحت /etc/
 */
export function scopeMatches(pattern: string, scope: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('**')) return scope.startsWith(pattern.slice(0, -2));
  if (pattern.endsWith('*')) return scope.startsWith(pattern.slice(0, -1));
  return pattern === scope;
}

/**
 * محرك السياسة (C4 / ADR-0003): يقيّم طلب صلاحية ضد المنح وسياسة الموافقة.
 * deny له الأسبقية دائمًا، والموافقة policy-driven (C13).
 */
export class PolicyEngine {
  constructor(
    private grants: Grant[] = [],
    private approvalPolicy: ApprovalPolicy = DEFAULT_APPROVAL_POLICY,
  ) {}

  addGrant(grant: Grant): void {
    if (this.grants.some((g) => g.id === grant.id)) {
      throw new Error(`grant '${grant.id}' already exists`);
    }
    this.grants.push(grant);
  }

  removeGrant(id: string): void {
    this.grants = this.grants.filter((g) => g.id !== id);
  }

  listGrants(): Grant[] {
    return [...this.grants];
  }

  evaluate(principal: string, capability: Capability, scope = '*'): PolicyDecision {
    const relevant = this.grants.filter(
      (g) => g.principal === principal && g.capability === capability && scopeMatches(g.scope, scope),
    );

    const deny = relevant.find((g) => g.effect === 'deny');
    if (deny) {
      return {
        allowed: false,
        approvalRequired: false,
        reason: `denied by grant '${deny.id}' (${deny.scope})`,
      };
    }

    const allow = relevant.find((g) => g.effect === 'allow');
    if (!allow) {
      return {
        allowed: false,
        approvalRequired: false,
        reason: `no allow grant for '${capability}' on '${scope}'`,
      };
    }

    const requirement = this.approvalPolicy[capability] ?? 'approval'; // الافتراضي: تشديد
    if (requirement === 'approval') {
      return {
        allowed: true,
        approvalRequired: true,
        reason: `'${capability}' requires approval by policy`,
      };
    }
    return { allowed: true, approvalRequired: false, reason: 'allowed by policy' };
  }
}
