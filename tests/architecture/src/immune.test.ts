import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  REPO_ROOT,
  LAYERS,
  ALLOWED_DEPS,
  layerOfPackage,
  packageNameToLayer,
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

const IMMUNE_DIR = join(REPO_ROOT, 'kernel/immune');

/** Immune Tests — IMMUNE PRINCIPLE 012: الجهاز المناعي نفسه قابل للملاحظة والاختبار. */
describe('Immune System Tests', () => {
  it('the immune package exists with its seven organs', () => {
    const organs = [
      'detector.ts',
      'risk-engine.ts',
      'policy-firewall.ts',
      'quarantine.ts',
      'recovery.ts',
      'integrity.ts',
      'incident.ts',
    ];
    for (const o of organs) {
      expect(existsSync(join(IMMUNE_DIR, 'src', o)), `${o} must exist`).toBe(true);
    }
  });

  it('the immune contract is top contract 07 (IMMUNE_SYSTEM_CONTRACT.md)', () => {
    expect(existsSync(join(REPO_ROOT, 'docs/IMMUNE_SYSTEM_CONTRACT.md'))).toBe(true);
    const constitution = readFileSync(join(REPO_ROOT, 'docs/KERNEL_CONSTITUTION.md'), 'utf8');
    expect(constitution).toContain('07 IMMUNE_SYSTEM_CONTRACT.md');
  });

  it('all twelve IMMUNE PRINCIPLES are declared in the contract', () => {
    const contract = readFileSync(join(REPO_ROOT, 'docs/IMMUNE_SYSTEM_CONTRACT.md'), 'utf8');
    for (let i = 1; i <= 12; i++) {
      expect(contract, `IMMUNE PRINCIPLE ${String(i).padStart(3, '0')} must be declared`).toContain(
        `IMMUNE PRINCIPLE ${String(i).padStart(3, '0')}`,
      );
    }
  });

  it('immune layer depends only on contracts + kernel (never plugins/adapters)', () => {
    expect(layerOfPackage(IMMUNE_DIR)).toBe('immune');
    for (const dep of workspaceDepsOf(IMMUNE_DIR)) {
      const depLayer = packageNameToLayer(dep);
      expect(ALLOWED_DEPS.immune, `kernel/immune → ${dep}`).toContain(depLayer);
    }
  });

  it('immune package never imports plugins, adapters, or paid SDKs', () => {
    const forbidden = ['@aok/agents', '@aok/tools', '@aok/models', '@aok/memory', '@aok/verification', '@aok/vault', '@aok/github'];
    for (const file of walk(IMMUNE_DIR)) {
      const src = readFileSync(file, 'utf8');
      for (const f of forbidden) {
        expect(src, `${relative(REPO_ROOT, file)} imports ${f}`).not.toContain(`'${f}'`);
        expect(src, `${relative(REPO_ROOT, file)} imports ${f}`).not.toContain(`"${f}"`);
      }
    }
  });

  it('NO Tool/Agent/Plugin/Runner can bypass the Immune Gate: plugins & adapters must not depend on @aok/immune', () => {
    for (const dir of [...LAYERS.plugins, ...LAYERS.adapters]) {
      const abs = join(REPO_ROOT, dir);
      if (!existsSync(abs)) continue;
      for (const dep of workspaceDepsOf(abs)) {
        expect(dep, `${dir} must not depend on @aok/immune (cannot bypass the gate)`).not.toBe('@aok/immune');
      }
      for (const file of walk(abs)) {
        const src = readFileSync(file, 'utf8');
        expect(src, `${relative(REPO_ROOT, file)} imports @aok/immune`).not.toMatch(/from\s+['"]@aok\/immune['"]/);
      }
    }
  });

  it('the golden rule is enforced: runner routes every action through the Immune Gate', () => {
    const runner = readFileSync(join(REPO_ROOT, 'apps/cli/src/local-runner.ts'), 'utf8');
    expect(runner).toContain('@aok/immune');
    expect(runner).toMatch(/immune\.evaluate/);
  });

  it('kill switch is policy-gated (agent.kill never decides itself)', () => {
    const ks = readFileSync(join(IMMUNE_DIR, 'src/kill-switch.ts'), 'utf8');
    expect(ks).toContain('policy');
    expect(ks).toContain('immune.kill');
  });

  it('quarantine state machine implements the six states', () => {
    const q = readFileSync(join(IMMUNE_DIR, 'src/quarantine.ts'), 'utf8');
    for (const s of ['ACTIVE', 'SUSPICIOUS', 'QUARANTINED', 'ANALYSIS', 'RECOVERED', 'REVOKED']) {
      expect(q).toContain(s);
    }
  });

  it('circuit breaker implements closed/open/half-open', () => {
    const cb = readFileSync(join(IMMUNE_DIR, 'src/circuit-breaker.ts'), 'utf8');
    for (const s of ['closed', 'open', 'half-open']) {
      expect(cb).toContain(s);
    }
  });

  it('recovery defines levels 0..5 without reckless self-healing', () => {
    const types = readFileSync(join(IMMUNE_DIR, 'src/types.ts'), 'utf8');
    expect(types).toContain('restore checkpoint');
    expect(types).toContain('require human approval');
    const r = readFileSync(join(IMMUNE_DIR, 'src/recovery.ts'), 'utf8');
    expect(r).toContain('verified');
  });

  it('CLI exposes safe-mode and emergency-lock', () => {
    const cli = readFileSync(join(REPO_ROOT, 'apps/cli/src/cli.ts'), 'utf8');
    expect(cli).toContain('safe-mode');
    expect(cli).toContain('emergency-lock');
  });
});
