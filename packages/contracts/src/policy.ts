import type { Capability } from './capabilities';

/** متى تُطلب الموافقة البشرية (ADR-0003 / C13): auto = بدون موافقة، approval = موافقة إلزامية. */
export type ApprovalRequirement = 'auto' | 'approval';

export type GrantEffect = 'allow' | 'deny';

/** منح صلاحية لـprincipal (agent أو user) على قدرة مع نطاق مورد. deny له الأسبقية. */
export interface Grant {
  id: string;
  principal: string; // 'agent:<id>' | 'user:<id>' | 'system'
  capability: Capability;
  scope: string; // نمط المورد: '*' = الكل، 'repo:elazamey/chat.ai'، 'domain:github.com'
  effect: GrantEffect;
}

/** نتيجة تقييم الـPolicy لطلب صلاحية. */
export interface PolicyDecision {
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
}

export type ApprovalPolicy = Record<Capability, ApprovalRequirement>;

/** السياسة الافتراضية (C13): read/edit → auto، push/delete/deploy/secret → approval. */
export const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = {
  'repo.read': 'auto',
  'repo.write': 'auto',
  'git.commit': 'auto',
  'git.push': 'approval',
  'shell.execute': 'approval',
  'network.http': 'auto',
  'secret.read': 'approval',
  'deployment.create': 'approval',
  'deployment.delete': 'approval',
  'browser.navigate': 'auto',
  'fs.read': 'auto',
  'fs.write': 'auto',
  'db.query': 'approval',
};
