import type { Detection, ImmuneAction } from './types';

export interface FirewallVerdict {
  blocked: boolean;
  action: ImmuneAction;
  reason: string;
}

/**
 * الـPolicy Firewall (IMMUNE §2، القاعدة الذهبية):
 *   Agent → request → Immune System → Policy → Execution
 * لا `Agent → execute` — حتى لو كان الـAgent "موثوقًا".
 *
 * هنا تُطبَّق القرارات الحتمية (deny-by-default) قبل أي تنفيذ:
 * حقن تعليمات، تسميم أداة/ذاكرة، تصعيد صلاحية، وصول أسرار شاذ.
 */
export class PolicyFirewall {
  evaluate(detections: Detection[]): FirewallVerdict | null {
    for (const d of detections) {
      switch (d.kind) {
        case 'prompt_injection':
          return { blocked: true, action: 'block', reason: `prompt injection: ${d.detail}` };
        case 'memory_poisoning':
          return { blocked: true, action: 'block', reason: `memory poisoning: ${d.detail}` };
        case 'tool_poisoning':
          return { blocked: true, action: 'quarantine', reason: `tool poisoning: ${d.detail}` };
        case 'permission_escalation':
          return { blocked: true, action: 'block', reason: `privilege escalation: ${d.detail}` };
        case 'secret_access_anomaly':
          return { blocked: true, action: 'block', reason: `secret access anomaly: ${d.detail}` };
        case 'ledger_tampering_attempt':
          return { blocked: true, action: 'block', reason: `ledger tampering: ${d.detail}` };
        case 'kernel_integrity_failure':
          return { blocked: true, action: 'kill', reason: `kernel integrity failure: ${d.detail}` };
        default:
          break;
      }
    }
    return null;
  }
}
