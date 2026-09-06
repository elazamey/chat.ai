import { readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** جذر المستودع (يُحلّ من موقع هذا الملف). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * طبقات النظام واتجاه التبعية (قانون دستور النواة):
 *
 *   contracts ← kernel ← runtime ← plugins ← adapters
 *
 * الداخل لا يعرف الخارج أبدًا.
 */
export const LAYERS = {
  contracts: ['kernel/contracts'],
  kernel: ['kernel/execution', 'kernel/capability', 'kernel/policy', 'kernel/transition', 'kernel/events', 'kernel/economics', 'kernel/registry', 'kernel/provenance'],
  immune: ['kernel/immune'],
  runtime: ['runtime/scheduler', 'runtime/sandbox'],
  plugins: ['plugins/agents', 'plugins/tools', 'plugins/tools/github', 'plugins/models', 'plugins/memory', 'plugins/verification'],
  adapters: ['adapters/vault', 'adapters/billing'],
  apps: ['apps/cli'],
} as const;

export type LayerName = keyof typeof LAYERS;

export const ALLOWED_DEPS: Record<LayerName, LayerName[]> = {
  contracts: [],
  kernel: ['contracts', 'kernel'],
  immune: ['contracts', 'kernel'],
  runtime: ['contracts', 'kernel', 'immune'],
  plugins: ['contracts', 'kernel', 'runtime'],
  adapters: ['contracts'],
  apps: ['contracts', 'kernel', 'immune', 'runtime', 'plugins', 'adapters'],
};

export function layerOfPackage(pkgDir: string): LayerName | undefined {
  const rel = relative(REPO_ROOT, pkgDir);
  for (const [layer, dirs] of Object.entries(LAYERS)) {
    if ((dirs as readonly string[]).includes(rel)) return layer as LayerName;
  }
  return undefined;
}

export function packageNameOf(pkgDir: string): string {
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as { name?: string };
  return pkg.name ?? '';
}

export function packageNameToLayer(name: string): LayerName | undefined {
  for (const [layer, dirs] of Object.entries(LAYERS)) {
    for (const d of dirs as readonly string[]) {
      if (packageNameOf(join(REPO_ROOT, d)) === name) return layer as LayerName;
    }
  }
  return undefined;
}

/** الحزم المسموحة داخل النواة/الـruntime (نواة تعمل محليًا بـ$0). */
export const CORE_ALLOWED_DEPS = ['@aok/contracts'];

export function listPackages(): string[] {
  const out: string[] = [];
  for (const dirs of Object.values(LAYERS)) {
    for (const d of dirs as readonly string[]) {
      const abs = join(REPO_ROOT, d);
      if (existsSync(abs)) out.push(abs);
    }
  }
  return out;
}

/** تبعيات الـworkspace (@aok/*) لحزمة ما، من dependencies + devDependencies. */
export function workspaceDepsOf(pkgDir: string): string[] {
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Object.keys(deps).filter((k) => k.startsWith('@aok/'));
}
