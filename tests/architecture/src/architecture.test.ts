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

describe('RULE 001/002: kernel must not know agents, tools, models, memory, verification, vault, github', () => {
  const forbidden = ['@aok/agents', '@aok/tools', '@aok/models', '@aok/memory', '@aok/verification', '@aok/vault', '@aok/github'];

  it('kernel + immune + runtime source never imports plugins/adapters', () => {
    const scoped = [...LAYERS.kernel, ...LAYERS.immune, ...LAYERS.runtime];
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

  it('kernel/immune/runtime packages depend only on internal @aok packages (contracts or kernel)', () => {
    for (const dir of [...LAYERS.kernel, ...LAYERS.immune, ...LAYERS.runtime]) {
      for (const dep of workspaceDepsOf(join(REPO_ROOT, dir))) {
        const depLayer = packageNameToLayer(dep);
        expect(
          ['contracts', 'kernel'],
          `${dir} may only depend on contracts/kernel (got ${dep} → ${depLayer})`,
        ).toContain(depLayer);
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

describe('ECONOMIC PRINCIPLE 001: the kernel must operate without a paid dependency', () => {
  const PAID_VENDOR_SDKS = [
    'stripe',
    'aws-sdk',
    '@aws-sdk',
    '@google-cloud',
    '@azure',
    'openai',
    '@anthropic-ai',
    '@google/generative-ai',
  ];

  it('kernel + immune + runtime packages depend on no paid-service SDK (internal @aok only)', () => {
    for (const dir of [...LAYERS.kernel, ...LAYERS.immune, ...LAYERS.runtime]) {
      const deps = workspaceDepsOf(join(REPO_ROOT, dir));
      for (const dep of deps) {
        expect(PAID_VENDOR_SDKS, `${dir} must not depend on paid SDK`).not.toContain(dep);
        expect(dep.startsWith('@aok/'), `${dir} has external dependency '${dep}'`).toBe(true);
      }
    }
  });
});

describe('ECONOMIC PRINCIPLE 005/007: metering+quota in kernel, billing outside', () => {
  it('kernel measures and enforces (economics) without importing billing', () => {
    const src = readFileSync(join(REPO_ROOT, 'kernel/economics/src/index.ts'), 'utf8');
    expect(src).toContain('UsageMeter');
    expect(src).toContain('QuotaPolicy');
    expect(src).not.toContain('@aok/billing');
  });

  it('billing adapter depends only on contracts (external to the kernel)', () => {
    for (const dep of workspaceDepsOf(join(REPO_ROOT, 'adapters/billing'))) {
      expect(dep).toBe('@aok/contracts');
    }
  });
});

describe('ATOMICITY PRINCIPLE 011: GitHub is an external plugin — ZERO kernel knowledge', () => {
  it('kernel/immune/runtime never import @aok/github or any github SDK', () => {
    for (const dir of [...LAYERS.kernel, ...LAYERS.immune, ...LAYERS.runtime]) {
      for (const file of walk(join(REPO_ROOT, dir))) {
        const src = readFileSync(file, 'utf8');
        expect(src, `${relative(REPO_ROOT, file)} imports @aok/github`).not.toMatch(
          /from\s+['"]@aok\/github['"]/,
        );
        expect(src, `${relative(REPO_ROOT, file)} imports a github SDK`).not.toMatch(
          /from\s+['"](?:@?octokit[a-z0-9/@-]*|github)['"]/,
        );
      }
    }
  });

  it('kernel/immune/runtime package.json declare no @aok/github dependency', () => {
    for (const dir of [...LAYERS.kernel, ...LAYERS.immune, ...LAYERS.runtime]) {
      for (const dep of workspaceDepsOf(join(REPO_ROOT, dir))) {
        expect(dep, `${dir} must not depend on @aok/github`).not.toBe('@aok/github');
      }
    }
  });

  it('the github plugin lives in plugins/ and depends only on allowed layers', () => {
    const pkgDir = join(REPO_ROOT, 'plugins/tools/github');
    expect(layerOfPackage(pkgDir)).toBe('plugins');
    for (const dep of workspaceDepsOf(pkgDir)) {
      const depLayer = packageNameToLayer(dep);
      expect(ALLOWED_DEPS.plugins, `plugins/tools/github → ${dep}`).toContain(depLayer);
    }
  });
});

describe('ECONOMIC PRINCIPLE 009: BYOK + local models', () => {
  it('model credentials hold a SecretRef, never a raw key (RULE 007)', () => {
    const src = readFileSync(join(REPO_ROOT, 'plugins/models/src/provider.ts'), 'utf8');
    expect(src).toContain('secretRef');
    expect(src).toContain("kind: 'byok'");
  });

  it('a zero-cost deterministic mock model exists for CI/dev', () => {
    const src = readFileSync(join(REPO_ROOT, 'plugins/models/src/provider.ts'), 'utf8');
    expect(src).toContain('MockProvider');
    expect(src).toContain('costPer1kInputUsd: 0');
  });
});
