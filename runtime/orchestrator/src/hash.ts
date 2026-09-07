import { createHash } from 'node:crypto';

/** canonical stringify حتمي (ترتيب مفاتيح ثابت) لاشتقاق hashes قابلة لإعادة التشغيل. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** idempotencyKey ثابت عبر المحاولات وإعادة التشغيل: hash(operationId, input). */
export function idempotencyKey(operationId: string, input: unknown): string {
  return sha256(`${operationId}\u0000${stableStringify(input)}`);
}

/** استخراج قيمة من مسار نقاط (مثل 'output.passed'). */
export function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function isInputRef(value: unknown): value is { $ref: { nodeId: string; path: string } } {
  if (value === null || typeof value !== 'object') return false;
  const ref = (value as { $ref?: unknown }).$ref;
  if (ref === null || typeof ref !== 'object') return false;
  const r = ref as { nodeId?: unknown; path?: unknown };
  return typeof r.nodeId === 'string' && typeof r.path === 'string';
}
