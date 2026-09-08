import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { computeGenesisHash } from '@aok/provenance';
import { REPO_ROOT } from './rules';

/** Ownership Tests — المبادئ قابلة للتنفيذ (OWNERSHIP_CONTRACT §8). */

function trackedFiles(): string[] {
  return execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.includes('node_modules'));
}

describe('Ownership Tests', () => {
  it('project identity exists and is parseable', () => {
    const p = join(REPO_ROOT, 'PROJECT_IDENTITY.yaml');
    expect(existsSync(p)).toBe(true);
    const identity = parseYaml(readFileSync(p, 'utf8')) as {
      project: { id: string };
      ownership: { primary_owner: string };
    };
    expect(identity.project.id).toBeTruthy();
    expect(identity.ownership.primary_owner).toBeTruthy();
  });

  it('genesis record exists and is reproducible (genesis hash matches)', () => {
    const identity = parseYaml(readFileSync(join(REPO_ROOT, 'PROJECT_IDENTITY.yaml'), 'utf8')) as {
      project: { id: string; name: string; namespace: string; genesis_commit: string };
      ownership: { primary_owner: string; repository_owner: string };
      provenance: { genesis_hash: string };
    };
    const computed = computeGenesisHash({
      projectId: identity.project.id,
      name: identity.project.name,
      namespace: identity.project.namespace,
      primaryOwner: identity.ownership.primary_owner,
      repositoryOwner: identity.ownership.repository_owner,
      genesisCommit: identity.project.genesis_commit,
    });
    expect(computed).toBe(identity.provenance.genesis_hash);
  });

  it('owner is declared', () => {
    const yaml = readFileSync(join(REPO_ROOT, 'PROJECT_IDENTITY.yaml'), 'utf8');
    expect(yaml).toMatch(/primary_owner:\s*\S+/);
  });

  it('license is declared (LICENSE + identity)', () => {
    expect(existsSync(join(REPO_ROOT, 'LICENSE'))).toBe(true);
    const license = readFileSync(join(REPO_ROOT, 'LICENSE'), 'utf8');
    expect(license).toContain('Apache License');
    const identity = parseYaml(readFileSync(join(REPO_ROOT, 'PROJECT_IDENTITY.yaml'), 'utf8')) as {
      license: { core: string };
    };
    expect(identity.license.core).toBe('Apache-2.0');
  });

  it('CODEOWNERS protects the kernel', () => {
    const codeowners = readFileSync(join(REPO_ROOT, '.github/CODEOWNERS'), 'utf8');
    expect(codeowners).toContain('/kernel/**');
  });

  it('contribution policy is declared (CONTRIBUTING.md + DCO)', () => {
    expect(existsSync(join(REPO_ROOT, 'CONTRIBUTING.md'))).toBe(true);
    const contributing = readFileSync(join(REPO_ROOT, 'CONTRIBUTING.md'), 'utf8');
    expect(contributing).toContain('Developer Certificate of Origin');
  });

  it('the seven top contracts exist', () => {
    const contracts = [
      'KERNEL_CONSTITUTION.md',
      'ATOMIC_KERNEL_CONTRACT.md',
      'ZERO_COST_ECONOMIC_CONTRACT.md',
      'SECURITY_CONTRACT.md',
      'OWNERSHIP_CONTRACT.md',
      'PROVENANCE_CONTRACT.md',
      'IMMUNE_SYSTEM_CONTRACT.md',
    ];
    for (const c of contracts) {
      expect(existsSync(join(REPO_ROOT, 'docs', c)), `${c} must exist`).toBe(true);
    }
  });

  it('provenance contract references the genesis record', () => {
    const provenance = readFileSync(join(REPO_ROOT, 'docs/PROVENANCE_CONTRACT.md'), 'utf8');
    expect(provenance).toContain('5a40a841a4db459521b404e19e30e1a7971b5770');
    expect(provenance).toContain('genesis_hash');
  });

  it('third-party licenses are tracked (every external dependency is declared)', () => {
    const notices = readFileSync(join(REPO_ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8');
    const external = new Set<string>();
    for (const f of trackedFiles().filter((p) => p.endsWith('package.json'))) {
      const pkg = JSON.parse(readFileSync(join(REPO_ROOT, f), 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        if (name.startsWith('@aok/') || version.startsWith('workspace:')) continue;
        external.add(name);
      }
    }
    // Exact package-name match against rows of the "## السجل" table — a
    // substring match lets an undeclared short name (`vite`) pass via a
    // longer declared one (`vitest`). (Gate C finding F-03.)
    const registrySection = notices.split(/^## /m).find((s) => s.startsWith('السجل')) ?? '';
    const declared = new Set(
      registrySection
        .split('\n')
        .map((line) => /^\|\s*([^|]+?)\s*\|/.exec(line)?.[1]?.trim())
        .filter((cell): cell is string => !!cell && cell !== '---' && cell !== 'الحزمة'),
    );
    for (const name of external) {
      expect(
        declared.has(name),
        `dependency '${name}' must be declared as its own row in THIRD_PARTY_NOTICES.md`,
      ).toBe(true);
    }
  });

  it('secrets are excluded (scan tracked files for credential patterns)', () => {
    const patterns: RegExp[] = [
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /AKIA[0-9A-Z]{16}/,
      /ghp_[A-Za-z0-9]{20,}/,
      /AIza[0-9A-Za-z_-]{30,}/,
      /xox[baprs]-[A-Za-z0-9-]{10,}/,
    ];
    for (const f of trackedFiles()) {
      if (!/\.(ts|js|json|yaml|yml|md|sh|txt)$/.test(f)) continue;
      const content = readFileSync(join(REPO_ROOT, f), 'utf8');
      for (const p of patterns) {
        expect(content, `secret pattern detected in ${f}: ${p}`).not.toMatch(p);
      }
    }
  });

  it('unauthorized identity change is detectable (hash changes)', () => {
    const identity = parseYaml(readFileSync(join(REPO_ROOT, 'PROJECT_IDENTITY.yaml'), 'utf8')) as {
      project: { id: string; name: string; namespace: string; genesis_commit: string };
      ownership: { primary_owner: string; repository_owner: string };
    };
    const base = {
      projectId: identity.project.id,
      name: identity.project.name,
      namespace: identity.project.namespace,
      primaryOwner: identity.ownership.primary_owner,
      repositoryOwner: identity.ownership.repository_owner,
      genesisCommit: identity.project.genesis_commit,
    };
    const h1 = computeGenesisHash(base);
    const h2 = computeGenesisHash({ ...base, primaryOwner: 'intruder' });
    expect(h1).not.toBe(h2);
  });

  it('ownership ledger is part of the kernel (provenance package exists)', () => {
    const p = join(REPO_ROOT, 'kernel/provenance/src/ownership-ledger.ts');
    expect(existsSync(p)).toBe(true);
    const src = readFileSync(p, 'utf8');
    expect(src).toContain('class OwnershipLedger');
    expect(src).toContain('OWNERSHIP_EVENT_TYPES');
  });
});
