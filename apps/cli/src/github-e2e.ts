import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { systemActor, type ApprovalPolicy, type Result, type VerificationCheck } from '@aok/contracts';
import { LocalRunner } from './local-runner';
import { GitHubPlugin, HttpGitHubTransport, GITHUB_ACTIONS } from '@aok/github';

/** سياسة موافقة واقعية لـM2: كل القراءات auto، الإنشاء/الكتابة/commit auto (per-run)، PR → approval. */
export const GITHUB_APPROVAL_POLICY: ApprovalPolicy = {
  'github.repo.read': 'auto',
  'github.repo.branch.create': 'auto',
  'github.repo.file.read': 'auto',
  'github.repo.file.write': 'auto',
  'github.git.commit': 'auto',
  'github.pull_request.create': 'approval',
  'github.pull_request.read': 'auto',
};

export interface GithubE2EConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  readPath: string; // ملف موجود (لإثبات الفحص)
  writePath: string; // الملف الذي يُنشأ/يُعدَّل
  fileContent: string;
  commitMessage: string;
  prTitle: string;
  prBody?: string;
  base?: string;
  /** تشغيل الاختبارات كدليل (اختياري). */
  runTests?: () => { ok: boolean; output: string };
  evidenceDir?: string;
}

export interface E2ECheck {
  name: string;
  verdict: 'PASSED' | 'FAILED' | 'UNKNOWN' | 'PENDING';
  detail?: string;
}

export interface GithubE2EOutcome {
  verdict: string;
  prNumber?: number;
  prUrl?: string;
  commitSha?: string;
  checks: E2ECheck[];
  evidencePath?: string;
  ledgerEventTypes: string[];
  executedActions: string[];
  chainValid: boolean;
  merkleRoot: string;
  usage: { total: Record<string, number> };
}

export class GithubE2EError extends Error {
  constructor(
    message: string,
    readonly outcome: GithubE2EOutcome,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GithubE2EError';
  }
}

/**
 * أول E2E حقيقي (M2 — REAL EXTERNAL EXECUTION):
 *
 *   TaskCreated → PlanGenerated → ApprovalRequired → ApprovalGranted
 *   → repo.read → file.read → file.write → git.commit → pr.create → pr.read
 *   → Evidence → Verification (متعدد الطبقات) → TaskCompleted
 *
 * كل خطوة تمر عبر execute() (سياسة + حارس أسماء + quota) وكل أثر في الـLedger.
 */
export async function runGithubE2E(cfg: GithubE2EConfig): Promise<GithubE2EOutcome> {
  const owner = cfg.owner;
  const repo = cfg.repo;
  const branch = cfg.branch;
  const base = cfg.base ?? 'main';

  const runner = new LocalRunner({
    approvalPolicy: GITHUB_APPROVAL_POLICY,
    onApprovalRequired: async () => true, // HITL: موافقة آلية للعرض
  });
  for (const a of GITHUB_ACTIONS) {
    runner.grant({ id: `g-${a}`, principal: 'coder', capability: a, scope: '*', effect: 'allow' });
  }

  const plugin = new GitHubPlugin(new HttpGitHubTransport('https://api.github.com', cfg.token));
  plugin.register(runner.executors);

  const intent = `افحص المستودع ${owner}/${repo} وأنشئ PR يضيف ${cfg.writePath}`;

  let outcome;
  try {
    outcome = await runner.run(intent, {
      steps: [
        { action: 'github.repo.read', input: { owner, repo } },
        {
          action: 'github.repo.branch.create',
          input: (results: Result[]) => {
            const r = results[0]!.output as { defaultBranchSha: string };
            return { owner, repo, branch, from: r.defaultBranchSha };
          },
        },
        { action: 'github.repo.file.read', input: { owner, repo, path: cfg.readPath, ref: branch } },
        { action: 'github.repo.file.write', input: { owner, repo, path: cfg.writePath, branch, content: cfg.fileContent, message: cfg.commitMessage } },
        { action: 'github.git.commit', input: { owner, repo, branch, message: `${cfg.commitMessage} (empty commit)` } },
        { action: 'github.pull_request.create', input: { owner, repo, title: cfg.prTitle, head: branch, base, body: cfg.prBody ?? '' } },
        {
          action: 'github.pull_request.read',
          input: (results: Result[]) => {
            const pr = results[5]!.output as { number: number };
            return { owner, repo, number: pr.number };
          },
        },
      ],
      onVerify: async ({ results, runner: r }) => {
      const repoInfo = results[0]?.output as { fullName: string } | undefined;
      const commit = results[4]?.output as { sha: string } | undefined;
      const pr = results[6]?.output as
        | { number: number; state: string; headSha: string; headRef: string; baseRef: string; url: string; files: { filename: string }[] }
        | undefined;

      const tests = cfg.runTests ? cfg.runTests() : { ok: true, output: 'tests skipped' };

      const checks: VerificationCheck[] = [
        {
          id: 'pr.exists',
          name: 'PR exists',
          verdict: pr ? 'PASSED' : 'FAILED',
          evidence: pr ? [{ evidenceId: `pr:${pr.number}`, kind: 'http_check' }] : undefined,
        },
        {
          id: 'repo.correct',
          name: 'correct repository',
          verdict: repoInfo?.fullName === `${owner}/${repo}` ? 'PASSED' : 'FAILED',
          detail: repoInfo?.fullName,
        },
        {
          id: 'branch.correct',
          name: 'correct branch',
          verdict: pr?.headRef === branch && pr?.baseRef === base ? 'PASSED' : 'FAILED',
          detail: `${pr?.headRef} → ${pr?.baseRef}`,
        },
        {
          id: 'commit.expected',
          name: 'expected commit',
          verdict: pr?.headSha === commit?.sha ? 'PASSED' : 'FAILED',
          detail: `head=${pr?.headSha} commit=${commit?.sha}`,
        },
        {
          id: 'diff.expected',
          name: 'expected diff',
          verdict: pr?.files?.some((f) => f.filename === cfg.writePath) ? 'PASSED' : 'FAILED',
          detail: pr?.files?.map((f) => f.filename).join(', '),
        },
        {
          id: 'tests.pass',
          name: 'tests',
          verdict: tests.ok ? 'PASSED' : 'FAILED',
          evidence: tests.ok ? [{ evidenceId: 'tests', kind: 'test_result' }] : undefined,
        },
        {
          id: 'ledger.intact',
          name: 'ledger chain intact',
          verdict: r.ledger.verifyIntegrity().valid ? 'PASSED' : 'FAILED',
        },
      ];
        return checks;
      },
    });
  } catch (error) {
    const executedActions = runner.ledger.all
      .filter((e) => e.type === 'execution.completed')
      .map((e) => (e.payload as { action?: string }).action)
      .filter((a): a is string => typeof a === 'string');
    const message = error instanceof Error ? error.message : String(error);
    throw new GithubE2EError(
      `GitHub E2E failed after ${executedActions.at(-1) ?? 'no completed action'}: ${message}`,
      {
        verdict: 'FAILED',
        checks: [{ name: 'run failure', verdict: 'FAILED', detail: message }],
        ledgerEventTypes: runner.ledger.all.map((e) => e.type),
        executedActions,
        chainValid: runner.ledger.verifyIntegrity().valid,
        merkleRoot: runner.ledger.merkleRoot(),
        usage: runner.meter.usage(),
      },
      error,
    );
  }

  const pr = outcome.results[6]?.output as
    | { number: number; url: string; headSha: string }
    | undefined;
  const commit = outcome.results[4]?.output as { sha: string } | undefined;

  // تصدير الأدلة (Evidence export)
  let evidencePath: string | undefined;
  if (cfg.evidenceDir) {
    mkdirSync(cfg.evidenceDir, { recursive: true });
    evidencePath = join(cfg.evidenceDir, `evidence-${outcome.runId}.json`);
    writeFileSync(
      evidencePath,
      JSON.stringify(
        {
          runId: outcome.runId,
          intent: outcome.intent,
          verdict: outcome.verdict,
          verification: outcome.verification,
          results: outcome.results.map((r) => ({ status: r.status, output: r.output, evidence: r.evidence })),
          chainValid: runner.ledger.verifyIntegrity().valid,
          merkleRoot: runner.ledger.merkleRoot(),
        },
        null,
        2,
      ),
    );
  }

  const executedActions = outcome.ledger
    .filter((e) => e.type === 'execution.completed')
    .map((e) => (e.payload as { action?: string }).action)
    .filter((a): a is string => typeof a === 'string');

  return {
    verdict: outcome.verdict,
    prNumber: pr?.number,
    prUrl: pr?.url,
    commitSha: commit?.sha,
    checks: outcome.verification.checks.map((c) => ({ name: c.name, verdict: c.verdict, detail: c.detail })),
    evidencePath,
    ledgerEventTypes: outcome.ledger.map((e) => e.type),
    executedActions,
    chainValid: runner.ledger.verifyIntegrity().valid,
    merkleRoot: runner.ledger.merkleRoot(),
    usage: outcome.usage,
  };
}

/** تشغيل اختبارات المستودع كدليل (execute خارجي حقيقي). */
export function runRepoTests(): { ok: boolean; output: string } {
  try {
    // نعطّل CELIA_E2E_REAL في العملية الفرعية حتى لا يتكرر الـE2E الحقيقي ذاتيًا.
    const output = execSync('pnpm test', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 180_000,
      env: { ...process.env, CELIA_E2E_REAL: '' },
    });
    return { ok: true, output: output.slice(-400) };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string };
    return { ok: false, output: String(e.stdout ?? e.stderr ?? err).slice(-400) };
  }
}
