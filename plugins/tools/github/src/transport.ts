/** نقل HTTP عام — عزل كامل للـKernel عن GitHub (ATOMICITY PRINCIPLE 011). */

export interface GitHubResponse {
  status: number;
  json: unknown;
}

export interface GitHubRequestOptions {
  body?: unknown;
}

export interface GitHubTransport {
  request(method: string, path: string, opts?: GitHubRequestOptions): Promise<GitHubResponse>;
}

export class GitHubRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly path: string,
  ) {
    super(`GitHub API ${status} on ${path}: ${message}`);
    this.name = 'GitHubRequestError';
  }
}

/** نقل HTTPS حقيقي نحو api.github.com (يُستبدل بـFakeTransport في الاختبارات). */
export class HttpGitHubTransport implements GitHubTransport {
  constructor(
    private baseUrl: string,
    private token: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async request(method: string, path: string, opts?: GitHubRequestOptions): Promise<GitHubResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: opts?.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text.length ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const msg = (json as { message?: string } | undefined)?.message ?? text;
      throw new GitHubRequestError(res.status, msg, path);
    }
    return { status: res.status, json };
  }
}
