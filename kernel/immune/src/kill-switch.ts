import type { KillOutcome, KillRequest, KillTargetType, PolicyView } from './types';

/**
 * Autonomous Kill Switch (IMMUNE §6):
 *   immune.kill(runId) · immune.kill(agentId) · immune.kill(pluginId) · immune.kill(runnerId)
 * وليس `agent.kill(anything)`:
 * الـAgent يستطيع أن *يطلب* إيقاف نفسه أو غيره، لكن القرار يمر عبر Policy.
 */
export class KillSwitch {
  private killed = new Map<KillTargetType, Set<string>>([
    ['run', new Set()],
    ['agent', new Set()],
    ['plugin', new Set()],
    ['runner', new Set()],
  ]);

  constructor(private policy?: PolicyView) {}

  /** الـAgent يطلب kill — القرار يمر عبر Policy (لا يستطيع الـAgent أن يقرر بنفسه). */
  request(req: KillRequest): KillOutcome {
    if (req.requester.startsWith('agent:') || req.requester.startsWith('tool:')) {
      if (!this.policy) {
        return { approved: false, applied: false, reason: 'kill requests require a policy evaluator' };
      }
      const d = this.policy.evaluate(req.requester, 'immune.kill', req.targetId);
      if (!d.allowed) {
        return { approved: false, applied: false, reason: `policy denied: ${d.reason}` };
      }
      if (d.approvalRequired) {
        return { approved: false, applied: false, reason: 'kill requires approval by policy' };
      }
      this.apply(req);
      return { approved: true, applied: true, reason: 'kill approved by policy' };
    }

    if (req.requester === 'system' || req.requester === 'immune') {
      this.apply(req);
      return { approved: true, applied: true, reason: 'system kill' };
    }

    return { approved: false, applied: false, reason: `unknown requester '${req.requester}'` };
  }

  private apply(req: KillRequest): void {
    this.killed.get(req.targetType)?.add(req.targetId);
  }

  isKilled(type: KillTargetType, id: string): boolean {
    return this.killed.get(type)?.has(id) ?? false;
  }

  killedIds(type: KillTargetType): string[] {
    return [...(this.killed.get(type) ?? [])];
  }
}
