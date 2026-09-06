/**
 * الصلاحيات الدقيقة (Capability-Based Security — ADR-0003).
 * لا يوجد "admin"; كل قدرة تُمنَح/تُرفَض على حدة عبر Policy Engine.
 *
 * ملاحظة ذرية: الفعل مفتوح (`Capability = string`) — فقدرات جديدة
 * (github.pull_request.create، deploy.staging، research.search، …)
 * لا تتطلب تعديل النواة. CAPABILITIES أدناه كتالوج مرجعي فقط.
 */
export const CAPABILITIES = [
  'repo.read',
  'repo.write',
  'git.commit',
  'git.push',
  'shell.execute',
  'network.http',
  'secret.read',
  'deployment.create',
  'deployment.delete',
  'browser.navigate',
  'fs.read',
  'fs.write',
  'db.query',
] as const;

export type Capability = string;
