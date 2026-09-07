import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT, LAYERS, ALLOWED_DEPS, layerOfPackage, packageNameToLayer, workspaceDepsOf } from './rules';

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

const ORCH_DIR = join(REPO_ROOT, 'runtime/orchestrator');
const ORCH_SRC = (f: string) => readFileSync(join(ORCH_DIR, 'src', f), 'utf8');

/** M4.11 — Architecture Tests: الـOrchestrator آلة تنفيذ صغيرة لا تملك البنية التحتية. */
describe('Orchestrator architecture (M4.11)', () => {
  it('the orchestrator package lives in the runtime layer', () => {
    expect(existsSync(join(ORCH_DIR, 'package.json'))).toBe(true);
    expect(layerOfPackage(ORCH_DIR)).toBe('runtime');
  });

  it('depends only on contracts + kernel (never plugins/adapters/storage/immune internals)', () => {
    for (const dep of workspaceDepsOf(ORCH_DIR)) {
      const layer = packageNameToLayer(dep);
      expect(ALLOWED_DEPS.runtime, `orchestrator → ${dep}`).toContain(layer);
      expect(['contracts', 'kernel'], `orchestrator may only use contracts/kernel (got ${dep})`).toContain(layer);
    }
  });

  it('does NOT own Policy/Ledger/Secrets/Model/Tool/Storage — it calls injected contracts', () => {
    // الـOrchestrator لا يستورد أي تطبيق للـPolicy/EventStore/Secrets/Model/Tool.
    const forbidden = [
      '@aok/policy',
      '@aok/events',
      '@aok/store',
      '@aok/vault',
      '@aok/models',
      '@aok/tools',
      '@aok/github',
      '@aok/economics',
      '@aok/verification',
    ];
    for (const file of walk(join(ORCH_DIR, 'src'))) {
      const src = readFileSync(file, 'utf8');
      for (const f of forbidden) {
        expect(src, `${relative(ORCH_DIR, file)} imports ${f}`).not.toMatch(new RegExp(`from\\s+['\"]${f.replace('@', '@')}['\"]`));
      }
    }
  });

  it('scheduler is an injected interface (enqueue/cancel/retry) — transport-agnostic', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain('enqueue(job: WorkflowJob): Promise<void>');
    expect(src).toContain('cancel(jobId: string): Promise<void>');
    expect(src).toContain('retry(jobId: string): Promise<void>');
  });

  it('node state machine has the exact legal transitions (no PLANNED→COMPLETED)', () => {
    const src = ORCH_SRC('node-machine.ts');
    expect(src).toContain("PLANNED: { PREPARE: 'READY', CANCEL: 'CANCELLED', SKIP: 'SKIPPED' }");
    expect(src).toContain("FAILED: { RETRY: 'RETRYING', COMPENSATE: 'COMPENSATING', QUARANTINE: 'QUARANTINED', CANCEL: 'CANCELLED' }");
    expect(src).toContain("RETRYING: { RESUME: 'RUNNING' }");
    expect(src).toContain("COMPENSATING: { ROLLBACK: 'ROLLED_BACK' }");
    expect(src).not.toMatch(/PLANNED:\s*\{[^}]*COMPLETE/);
  });

  it('retry policy is maxAttempts + backoff + retryableErrors + jitter (not "repeat 3 times")', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain('maxAttempts');
    expect(src).toContain("backoff: 'fixed' | 'exponential'");
    expect(src).toContain('retryableErrors');
    expect(src).toContain('jitter');
  });

  it('every job carries operationId + attempt + idempotencyKey (M4.5)', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain('operationId');
    expect(src).toContain('idempotencyKey');
    expect(src).toContain('attempt');
  });

  it('compensation supports forward+compensation and irreversible (no fake rollback)', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain('irreversible');
    expect(src).toContain('action: string');
  });

  it('bulkhead limits: maxConcurrentJobs + per-agent + per-tenant + per-tool', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain('maxConcurrentJobs');
    expect(src).toContain('maxConcurrentPerAgent');
    expect(src).toContain('maxConcurrentPerTenant');
    expect(src).toContain('maxConcurrentPerTool');
  });

  it('approval is a first-class node (APPROVAL) inside the DAG', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain("'APPROVAL'");
    expect(src).toContain('ApprovalSpec');
  });

  it('conditionals depend on verified results (on success/failure), not LLM text', () => {
    const src = ORCH_SRC('types.ts');
    expect(src).toContain("on: 'success' | 'failure'");
    expect(src).toContain('$ref');
  });

  it('supports crash recovery via hydrate() + resume() (M4.10)', () => {
    const src = ORCH_SRC('executor.ts');
    expect(src).toContain('async hydrate');
    expect(src).toContain('async resume');
  });
});
