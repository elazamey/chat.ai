import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  REPO_ROOT,
  LAYERS,
  ALLOWED_DEPS,
  layerOfPackage,
  packageNameToLayer,
  listPackages,
  workspaceDepsOf,
} from './rules';

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist') walk(p, files);
    } else if (p.endsWith('.ts')) {
      files.push(p);
    }
  }
  return files;
}

describe('RULE: dependency direction (contracts ← kernel ← runtime ← plugins ← adapters)', () => {
  const packages = listPackages();

  it('discovers packages across all layers', () => {
    expect(packages.length).toBeGreaterThanOrEqual(13);
  });

  for (const pkgDir of packages) {
    const rel = relative(REPO_ROOT, pkgDir);
    const layer = layerOfPackage(pkgDir)!;
    it(`${rel} only depends on its allowed layers`, () => {
      const allowed = ALLOWED_DEPS[layer];
      for (const dep of workspaceDepsOf(pkgDir)) {
        const depLayer = packageNameToLayer(dep);
        expect(depLayer, `${rel} → ${dep} resolves to a known layer`).toBeTruthy();
        expect(
          allowed,
          `VIOLATION: ${rel} (${layer}) may NOT depend on ${dep} (${depLayer})`,
        ).toContain(depLayer);
      }
    });
  }
});

describe('RULE 001/002: kernel must not know agents, tools, models, memory, verification, vault', () => {
  const forbidden = ['@aok/agents', '@aok/tools', '@aok/models', '@aok/memory', '@aok/verification', '@aok/vault'];

  it('kernel + runtime source never imports plugins/adapters', () => {
    const scoped = [...LAYERS.kernel, ...LAYERS.runtime];
    for (const dir of scoped) {
      for (const file of walk(join(REPO_ROOT, dir))) {
        const src = readFileSync(file, 'utf8');
        for (const f of forbidden) {
          expect(src, `${relative(REPO_ROOT, file)} imports forbidden ${f}`).not.toContain(`'${f}'`);
          expect(src, `${relative(REPO_ROOT, file)} imports forbidden ${f}`).not.toContain(`"${f}"`);
        }
      }
    }
  });

  it('kernel/runtime packages depend only on @aok/contracts (or nothing)', () => {
    for (const dir of [...LAYERS.kernel, ...LAYERS.runtime]) {
      for (const dep of workspaceDepsOf(join(REPO_ROOT, dir))) {
        expect(dep, `${dir} may only depend on @aok/contracts`).toBe('@aok/contracts');
      }
    }
  });
});

describe('RULE 003: no privileged execution without Capability', () => {
  it('tools declare permissions (ToolContract.permissions)', () => {
    const src = readFileSync(join(REPO_ROOT, 'kernel/contracts/src/tool.ts'), 'utf8');
    expect(src).toContain('permissions');
  });

  it('execution checks policy before running (execute.ts evaluates policy)', () => {
    const src = readFileSync(join(REPO_ROOT, 'kernel/execution/src/execute.ts'), 'utf8');
    expect(src).toContain('ctx.policy.evaluate');
  });
});

describe('RULE 004: every side effect produces an Event', () => {
  it('execution emits events around every action', () => {
    const src = readFileSync(join(REPO_ROOT, 'kernel/execution/src/execute.ts'), 'utf8');
    expect(src).toContain('ctx.emit');
  });

  it('the ledger is append-only (no update/delete methods)', () => {
    const src = readFileSync(join(REPO_ROOT, 'kernel/events/src/ledger.ts'), 'utf8');
    // تعريف دوال class فقط (وليست استدعاءات مثل hash.update(...))
    expect(src).not.toMatch(/^\s*(update|delete)\s*\(/m);
    expect(src).toContain('append');
  });
});
