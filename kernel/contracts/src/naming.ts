/**
 * اتفاقية التسمية (Namespace + Action) — Namespace Registry:
 * الأسماء الحرة مفتوحة لكنها يجب أن تلتزم بالـconvention،
 * ولا يُسمح بـ namespaces محجوزة (لا `admin.superpower` ولا `everything.allow`).
 */

/** الـnamespaces المحجوزة: لا يمكن لأي plugin استخدامها. */
export const RESERVED_NAMESPACES = [
  'admin',
  'kernel',
  'root',
  'system',
  'super',
  'everything',
  'anything',
  'global',
  'privileged',
  'sudo',
  'aok',
  'internal',
] as const;

/**
 * الشكل المطلوب:
 *   namespace.action  (قسمان على الأقل، lowercase، فواصل '.'، كل قسم يبدأ بحرف/رقم ولا يبدأ/ينتهي بشرطة)
 * أمثلة صحيحة:
 *   github.repo.read · github.pull_request.create · filesystem.file.read
 *   deploy.staging · verification.passed
 * أمثلة مرفوضة:
 *   admin.superpower (namespace محجوز) · Everything.Allow (أحرف كبيرة)
 *   github..read (نقطة مزدوجة) · .github (يبدأ بنقطة)
 */
const SEGMENT = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export interface NameValidation {
  valid: boolean;
  reason?: string;
}

export function namespaceOf(name: string): string {
  const dot = name.indexOf('.');
  return dot === -1 ? name : name.slice(0, dot);
}

export function isValidName(name: string): boolean {
  return validateName(name).valid;
}

export function validateName(name: string): NameValidation {
  if (typeof name !== 'string' || name.length === 0) {
    return { valid: false, reason: 'name must be a non-empty string' };
  }
  if (name !== name.toLowerCase()) {
    return { valid: false, reason: `'${name}' must be lowercase` };
  }
  if (name.startsWith('.') || name.endsWith('.')) {
    return { valid: false, reason: `'${name}' must not start or end with '.'` };
  }
  if (name.includes('..')) {
    return { valid: false, reason: `'${name}' contains empty segment` };
  }
  const segments = name.split('.');
  if (segments.length < 2) {
    return { valid: false, reason: `'${name}' must have at least a namespace and an action` };
  }
  for (const seg of segments) {
    if (!SEGMENT.test(seg)) {
      return { valid: false, reason: `segment '${seg}' is invalid` };
    }
  }
  const ns = namespaceOf(name);
  if ((RESERVED_NAMESPACES as readonly string[]).includes(ns)) {
    return { valid: false, reason: `namespace '${ns}' is reserved` };
  }
  return { valid: true };
}

/** التحقق من اسم قدرة (Capability). */
export function validateCapabilityName(name: string): NameValidation {
  return validateName(name);
}

/** التحقق من نوع حدث (Event type). */
export function validateEventType(name: string): NameValidation {
  return validateName(name);
}
