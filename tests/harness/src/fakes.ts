import { createHash } from 'node:crypto';
import type { Result, ModelInfo, ModelProvider, VaultAdapter, SecretRef, ShortLivedCredential } from '@aok/contracts';
import type { CapabilityExecutor } from '@aok/execution';
import { DeterministicIds } from './ids';

export interface ExecutorRegistrar {
  registerExecutor(action: string, executor: CapabilityExecutor): void;
}

function success(output: unknown, evidence: { evidenceId: string; kind: string }[]): Result {
  return { status: 'success', output, evidence };
}

/**
 * FakeGitHub — مستودع داخل الذاكرة يحاكي Git/GitHub بـ$0 وبدون شبكة.
 * يدعم read/write/commit/pull_request بأدلة حتمية (sha256) قابلة للتحقق.
 */
export class FakeGitHub {
  private files = new Map<string, Map<string, string>>();
  readonly commits: { sha: string; repo: string; message: string }[] = [];
  readonly pullRequests: { number: number; repo: string; title: string; branch: string }[] = [];
  private prCounter = 0;

  constructor(private ids = new DeterministicIds('git')) {}

  ensureRepo(repo: string, seed: Record<string, string>): void {
    this.files.set(repo, new Map(Object.entries(seed)));
  }

  readFile(repo: string, path: string): string {
    return this.files.get(repo)?.get(path) ?? '';
  }

  writeFile(repo: string, path: string, content: string): string {
    const map = this.files.get(repo) ?? new Map<string, string>();
    map.set(path, content);
    this.files.set(repo, map);
    return this.sha(`${repo}:${path}:${content}`);
  }

  commit(repo: string, message: string): string {
    const sha = this.sha(`${repo}:${message}:${this.ids.next('sha')}`);
    this.commits.push({ sha, repo, message });
    return sha;
  }

  createPullRequest(repo: string, title: string, branch: string): number {
    this.prCounter += 1;
    this.pullRequests.push({ number: this.prCounter, repo, title, branch });
    return this.prCounter;
  }

  /** يثبّت منفّذي GitHub الافتراضيين على أي Runner (يحقق نفس عقود أدوات M2). */
  register(reg: ExecutorRegistrar): void {
    const canExecute = async () => true;

    reg.registerExecutor('github.repo.read', {
      canExecute,
      execute: async (input) => {
        const { path } = (input ?? {}) as { path?: string };
        const content = this.readFile('fake/repo', path ?? '');
        return success({ path, content }, [{ evidenceId: `read:${path}`, kind: 'git_commit' }]);
      },
    });

    reg.registerExecutor('github.repo.file.write', {
      canExecute,
      execute: async (input) => {
        const { path, content } = (input ?? {}) as { path?: string; content?: string };
        const sha = this.writeFile('fake/repo', path ?? 'file.txt', content ?? '');
        return success({ path, sha }, [{ evidenceId: sha, kind: 'git_commit' }]);
      },
    });

    reg.registerExecutor('github.git.commit', {
      canExecute,
      execute: async (input) => {
        const { message } = (input ?? {}) as { message?: string };
        const sha = this.commit('fake/repo', message ?? 'auto');
        return success({ sha }, [{ evidenceId: sha, kind: 'git_commit' }]);
      },
    });

    reg.registerExecutor('github.pull_request.create', {
      canExecute,
      execute: async (input) => {
        const { title, branch } = (input ?? {}) as { title?: string; branch?: string };
        const number = this.createPullRequest('fake/repo', title ?? 'auto PR', branch ?? 'main');
        return success({ number }, [{ evidenceId: `pr:${number}`, kind: 'http_check' }]);
      },
    });
  }

  private sha(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}

/**
 * FakeModelProvider — نموذج حتمي قابل للتحكم:
 * يمكن ضبطه ليفشل (outage) أو ليعيد محتوى خبيثًا (اختبار دفاعات الحقن).
 */
export class FakeModelProvider implements ModelProvider {
  readonly id = 'fake';
  readonly models: ModelInfo[] = [
    {
      id: 'fake-1',
      providerId: 'fake',
      contextWindow: 100_000,
      maxOutputTokens: 2_000,
      supportsTools: true,
      supportsStructuredOutput: true,
      costPer1kInputUsd: 0,
      costPer1kOutputUsd: 0,
      latencyMs: 0,
      capabilities: ['completion', 'structured_output', 'tool_use'],
    },
  ];

  constructor(
    private opts: {
      failOnCall?: number[]; // استدعاءات تفشل (outage)
      respond?: (req: unknown, call: number) => string;
    } = {},
  ) {}

  private calls = 0;

  async invoke(req: unknown): Promise<{ provider: string; content: string }> {
    this.calls += 1;
    if (this.opts.failOnCall?.includes(this.calls)) {
      throw new Error(`[chaos] fake model outage on call ${this.calls}`);
    }
    const content = this.opts.respond ? this.opts.respond(req, this.calls) : 'fake deterministic response';
    return { provider: 'fake', content };
  }

  async *stream(req: unknown): AsyncIterable<{ provider: string; content: string }> {
    const res = await this.invoke(req);
    yield res;
  }
}

/**
 * FakeVault — Vault داخل الذاكرة مع revoke/rotate (لمحاكاة دورة حياة الاعتماد):
 * القيمة لا تُعاد إلا كـShortLivedCredential، وrevoke يمنع الاسترجاع.
 */
export class FakeVault implements VaultAdapter {
  private secrets = new Map<string, { value: string; revoked: boolean }>();

  put(ref: SecretRef, value: string): void {
    this.secrets.set(this.key(ref), { value, revoked: false });
  }

  revoke(ref: SecretRef): void {
    const e = this.secrets.get(this.key(ref));
    if (e) e.revoked = true;
  }

  async resolve(ref: SecretRef, _principal: string): Promise<ShortLivedCredential> {
    const e = this.secrets.get(this.key(ref));
    if (!e || e.revoked) throw new Error(`credential '${ref.key}' is revoked or missing`);
    return { value: e.value, expiresAt: new Date(Date.now() + 60_000).toISOString() };
  }

  private key(ref: SecretRef): string {
    return `${ref.vault}:${ref.key}`;
  }
}
