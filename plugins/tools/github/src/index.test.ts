import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  GitHubPlugin,
  GITHUB_ACTIONS,
  GitHubRequestError,
} from './index';
import type { GitHubResponse, GitHubRequestOptions, GitHubTransport } from './index';
import { ExecutorRegistry, createExecutionContext } from '@aok/execution';
import { validateCapabilityName } from '@aok/contracts';

/** نقل وهمي (offline) — يحاكي مسارات GitHub المستخدمة في الـE2E. */
class FakeGitHub implements GitHubTransport {
  refs = new Map<string, string>();
  files = new Map<string, { content: string; sha: string }>();
  prs: Record<number, Record<string, unknown>> = {};
  prCounter = 0;

  constructor() {
    this.refs.set('refs/heads/main', 'sha-main');
  }

  async request(method: string, path: string, opts?: GitHubRequestOptions): Promise<GitHubResponse> {
    const body = (opts?.body ?? {}) as Record<string, unknown>;
    // GET /repos/{o}/{r}
    if (method === 'GET' && /^\/repos\/[^/]+\/[^/]+$/.test(path)) {
      return { status: 200, json: { full_name: 'o/r', default_branch: 'main' } };
    }
    // GET /git/ref/heads/{branch}
    if (method === 'GET' && path.includes('/git/ref/heads/')) {
      const branch = 'refs/heads/' + path.split('/git/ref/heads/')[1];
      return { status: 200, json: { ref: branch, object: { sha: this.refs.get(branch) ?? 'sha-main' } } };
    }
    // POST /git/refs (create branch)
    if (method === 'POST' && path.endsWith('/git/refs')) {
      const ref = body.ref as string;
      this.refs.set(ref, body.sha as string);
      return { status: 201, json: { ref, object: { sha: body.sha } } };
    }
    // GET contents (file read)
    if (method === 'GET' && path.includes('/contents/')) {
      const key = path.split('/contents/')[1] ?? '';
      const file = this.files.get(key) ?? { content: Buffer.from('hello', 'utf8').toString('base64'), sha: 'sha-file' };
      return { status: 200, json: { content: file.content, sha: file.sha } };
    }
    // PUT contents (file write → commit)
    if (method === 'PUT' && path.includes('/contents/')) {
      const key = path.split('/contents/')[1] ?? '';
      const content = Buffer.from((body.content as string) ?? '', 'base64').toString('utf8');
      this.files.set(key, { content: (body.content as string), sha: 'sha-file-2' });
      return { status: 201, json: { commit: { sha: 'sha-commit-1' }, content: { sha: 'sha-file-2' } } };
    }
    // GET /git/commits/{sha}
    if (method === 'GET' && path.includes('/git/commits/')) {
      return { status: 200, json: { tree: { sha: 'tree-1' }, parents: [{ sha: 'sha-commit-1' }] } };
    }
    // POST /git/commits
    if (method === 'POST' && path.endsWith('/git/commits')) {
      return { status: 201, json: { sha: 'sha-commit-2' } };
    }
    // PATCH /git/refs/heads/{branch}
    if (method === 'PATCH' && path.includes('/git/refs/heads/')) {
      const branch = 'refs/heads/' + path.split('/git/refs/heads/')[1];
      this.refs.set(branch, body.sha as string);
      return { status: 200, json: { sha: body.sha } };
    }
    // POST /pulls
    if (method === 'POST' && path.endsWith('/pulls')) {
      const number = ++this.prCounter;
      this.prs[number] = {
        number,
        html_url: `https://github.com/o/r/pull/${number}`,
        head: { sha: 'sha-commit-2', ref: body.head },
        base: { ref: body.base },
        state: 'open',
        title: body.title,
      };
      return { status: 201, json: this.prs[number] };
    }
    // GET /pulls/{n}/files
    if (method === 'GET' && /\/pulls\/\d+\/files$/.test(path)) {
      return { status: 200, json: [{ filename: 'docs/e2e-marker.md', status: 'added' }] };
    }
    // GET /pulls/{n}
    if (method === 'GET' && /\/pulls\/\d+$/.test(path)) {
      const n = Number(path.split('/pulls/')[1]);
      return { status: 200, json: this.prs[n] ?? {} };
    }
    throw new GitHubRequestError(404, 'not found (fake)', path);
  }
}

describe('GitHubPlugin — capability names follow the convention', () => {
  it('all 7 actions are valid names (no reserved namespace)', () => {
    for (const a of GITHUB_ACTIONS) {
      expect(validateCapabilityName(a).valid, a).toBe(true);
    }
  });

  it('registers schemas for every action', () => {
    const plugin = new GitHubPlugin(new FakeGitHub());
    for (const a of GITHUB_ACTIONS) {
      expect(plugin.schemaRegistry.hasCapability(a), a).toBe(true);
    }
  });
});

describe('GitHubPlugin — offline vertical slice through the unified execute()', () => {
  async function runSlice() {
    const plugin = new GitHubPlugin(new FakeGitHub());
    const executors = new ExecutorRegistry();
    plugin.register(executors);

    const ctx = createExecutionContext({
      runId: 'r1',
      actorId: 'coder',
      capabilities: GITHUB_ACTIONS.map((action) => ({ id: action, action, scope: '*', constraints: [] })),
    });

    // استيراد execute من الـkernel (مفصول عن الـplugin)
    const { execute } = await import('@aok/execution');

    const repo = await execute('github.repo.read', { owner: 'o', repo: 'r' }, ctx, executors);
    expect(repo.status).toBe('success');

    const branch = await execute(
      'github.repo.branch.create',
      { owner: 'o', repo: 'r', branch: 'e2e', from: (repo.output as { defaultBranchSha: string }).defaultBranchSha },
      ctx,
      executors,
    );
    expect(branch.status).toBe('success');

    const write = await execute(
      'github.repo.file.write',
      { owner: 'o', repo: 'r', path: 'docs/e2e-marker.md', branch: 'e2e', content: '# e2e', message: 'e2e change' },
      ctx,
      executors,
    );
    expect(write.status).toBe('success');
    expect(write.evidence[0]?.kind).toBe('git_commit');

    const pr = await execute(
      'github.pull_request.create',
      { owner: 'o', repo: 'r', title: 'e2e', head: 'e2e', base: 'main' },
      ctx,
      executors,
    );
    expect(pr.status).toBe('success');
    return { pr, write, branch, repo };
  }

  it('executes repo.read → branch.create → file.write → pr.create with evidence', async () => {
    const { pr, write } = await runSlice();
    expect(pr.status).toBe('success');
    expect(write.evidence).toHaveLength(1);
    expect((pr.output as { number: number }).number).toBe(1);
  });

  it('validates input schemas (no execution without contract)', async () => {
    const plugin = new GitHubPlugin(new FakeGitHub());
    const executors = new ExecutorRegistry();
    plugin.register(executors);
    const { execute } = await import('@aok/execution');
    const ctx = createExecutionContext({
      runId: 'r1',
      actorId: 'coder',
      capabilities: [{ id: 'x', action: 'github.repo.read', scope: '*', constraints: [] }],
    });
    const res = await execute('github.repo.read', { bad: 'input' }, ctx, executors);
    expect(res.status).toBe('failure');
  });

  it('pr.read returns the diff (files) for verification', async () => {
    const plugin = new GitHubPlugin(new FakeGitHub());
    const executors = new ExecutorRegistry();
    plugin.register(executors);
    const { execute } = await import('@aok/execution');
    const ctx = createExecutionContext({
      runId: 'r1',
      actorId: 'coder',
      capabilities: GITHUB_ACTIONS.map((a) => ({ id: a, action: a, scope: '*', constraints: [] })),
    });
    // create then read
    await execute('github.pull_request.create', { owner: 'o', repo: 'r', title: 't', head: 'h', base: 'main' }, ctx, executors);
    const read = await execute('github.pull_request.read', { owner: 'o', repo: 'r', number: 1 }, ctx, executors);
    expect(read.status).toBe('success');
    expect((read.output as { files: { filename: string }[] }).files[0]?.filename).toBe('docs/e2e-marker.md');
  });

  it('uses the reserved-namespace-safe SchemaRegistry (zod)', () => {
    const plugin = new GitHubPlugin(new FakeGitHub());
    expect(() => plugin.schemaRegistry.validateCapabilityInput('github.repo.read', {})).toThrow(z.ZodError);
  });
});
