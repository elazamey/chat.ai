import type { CapabilitySpec, Constraint } from '@aok/contracts';

/**
 * قدرة واحدة (وحدة البناء الأساسية — وليس الـAgent).
 */
export function spec(action: string, scope = '*', constraints: Constraint[] = []): CapabilitySpec {
  return { id: `${action}@${scope}`, action, scope, constraints };
}

/** مجموعة مركّبة من القدرات. */
export interface CapabilitySet {
  id: string;
  capabilities: CapabilitySpec[];
}

/**
 * التركيب (Capability Composition) — "الانشطارية" الرسمية:
 * نركّب قدرات جديدة من قدرات أصغر دون تعديل الـKernel إطلاقًا.
 *
 *   repo.read + repo.write + git.commit + github.pull_request + test.run
 *     → SoftwareEngineer
 *   SoftwareEngineer + deploy.staging + browser.verify
 *     → ReleaseEngineer
 */
export function compose(
  id: string,
  ...parts: (CapabilitySet | CapabilitySpec[])[]
): CapabilitySet {
  const capabilities = parts.flatMap((p) => (Array.isArray(p) ? p : p.capabilities));
  const seen = new Set<string>();
  const unique = capabilities.filter((c) => {
    if (seen.has(c.action)) return false;
    seen.add(c.action);
    return true;
  });
  return { id, capabilities: unique };
}

/** هل تحوي المجموعة قدرة بفعل معيّن؟ */
export function has(set: CapabilitySet, action: string): boolean {
  return set.capabilities.some((c) => c.action === action);
}
