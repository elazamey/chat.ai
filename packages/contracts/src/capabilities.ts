/**
 * الصلاحيات الدقيقة (Capability-Based Security — ADR-0003).
 * لا يوجد "admin"; كل قدرة تُمنَح/تُرفَض على حدة عبر Policy Engine.
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

export type Capability = (typeof CAPABILITIES)[number];
