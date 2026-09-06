import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToolRegistry, ToolNotFoundError, validateShellCommand, extractBinary } from './index';
import { systemActor } from '@aok/contracts';
import type { ToolContract } from '@aok/contracts';

const readFileTool: ToolContract = {
  id: 'files.read',
  version: '1.0.0',
  description: 'read a file within the workspace',
  inputSchema: z.object({ path: z.string() }),
  outputSchema: z.object({ content: z.string() }),
  permissions: ['fs.read'],
  sideEffects: ['read'],
  networkPolicy: { mode: 'none' },
  timeoutMs: 1000,
};

describe('ToolRegistry', () => {
  it('registers, lists and resolves tools', () => {
    const r = new ToolRegistry();
    r.register(readFileTool, async () => ({ content: 'hi' }));
    expect(r.has('files.read')).toBe(true);
    expect(r.list().map((t) => t.id)).toContain('files.read');
  });

  it('rejects duplicate registration', () => {
    const r = new ToolRegistry();
    r.register(readFileTool, async () => ({ content: 'x' }));
    expect(() => r.register(readFileTool, async () => ({ content: 'y' }))).toThrow(/already registered/);
  });

  it('throws ToolNotFoundError for unknown tools', () => {
    const r = new ToolRegistry();
    expect(() => r.get('nope')).toThrow(ToolNotFoundError);
  });

  it('enforces input/output schemas (no execution without contract)', async () => {
    const r = new ToolRegistry();
    r.register(readFileTool, async (input) => ({ content: `read ${(input as { path: string }).path}` }));
    const ctx = { runId: 'r', taskId: 't', jobId: 'j', actor: systemActor };

    // مدخلات صحيحة
    const ok = await r.invoke('files.read', { path: '/a.txt' }, ctx);
    expect(ok.output).toEqual({ content: 'read /a.txt' });

    // مدخلات خاطئة → يفشل الـparse
    await expect(r.invoke('files.read', { nope: 1 }, ctx)).rejects.toThrow();
  });
});

describe('restricted shell (C15)', () => {
  const policy = {
    allowlist: ['git*', 'npm', 'node'],
    deny: ['rm'],
    timeoutMs: 5000,
    allowedCwd: '/workspace',
    envAllowlist: [],
    maxStdoutBytes: 1024,
    maxStderrBytes: 1024,
  };

  it('extracts the binary name', () => {
    expect(extractBinary('git status --short')).toBe('git');
    expect(extractBinary('/usr/bin/node x.js')).toBe('node');
  });

  it('allows allowlisted binaries (prefix matching)', () => {
    expect(validateShellCommand('git commit -m x', policy).allowed).toBe(true);
    expect(validateShellCommand('npm test', policy).allowed).toBe(true);
  });

  it('denies binaries not in the allowlist', () => {
    const d = validateShellCommand('curl https://x', policy);
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain('not in the allowlist');
  });

  it('deny list overrides the allowlist', () => {
    const p = { ...policy, allowlist: ['*'], deny: ['rm'] };
    expect(validateShellCommand('rm -rf /', p).allowed).toBe(false);
  });
});
