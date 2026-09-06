/**
 * الـShell المقيّد (C15 / ADR-0008): لا يوجد shell مفتوح.
 * أي أمر يُتحقق منه ضد allowlist/deny قبل التنفيذ.
 */

export interface ShellCommandPolicy {
  allowlist: string[]; // الأوامر/البرامج المسموحة (بشكل تام أو بادئة 'git*')
  deny: string[]; // أوامر ممنوعة صراحة (أسبقيتها على allowlist)
  timeoutMs: number;
  allowedCwd: string;
  envAllowlist: string[];
  maxStdoutBytes: number;
  maxStderrBytes: number;
}

export interface ShellCommandDecision {
  allowed: boolean;
  reason?: string;
  binary?: string;
}

/** يستخرج اسم البرنامج من بداية الأمر (قبل أي فاصل). */
export function extractBinary(command: string): string {
  const first = command.trim().split(/\s+/)[0] ?? '';
  // إزالة بادئات الاستدعاء مثل ./ أو المسار الكامل
  return first.split('/').pop() ?? first;
}

function matches(entry: string, binary: string): boolean {
  if (entry === '*') return true;
  if (entry.endsWith('*')) return binary.startsWith(entry.slice(0, -1));
  return entry === binary;
}

/**
 * يتحقق من أمر shell ضد السياسة. هذا هو "لا Shell مفتوح":
 * أي أمر غير مسموح صراحة يُرفض.
 */
export function validateShellCommand(command: string, policy: ShellCommandPolicy): ShellCommandDecision {
  const binary = extractBinary(command);
  if (policy.deny.some((d) => matches(d, binary))) {
    return { allowed: false, reason: `'${binary}' is explicitly denied`, binary };
  }
  if (!policy.allowlist.some((a) => matches(a, binary))) {
    return { allowed: false, reason: `'${binary}' is not in the allowlist`, binary };
  }
  if (command.length > policy.maxStdoutBytes) {
    return { allowed: false, reason: 'command exceeds max length', binary };
  }
  return { allowed: true, binary };
}
