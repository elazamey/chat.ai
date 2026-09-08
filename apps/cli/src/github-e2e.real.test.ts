import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runGithubE2E, runRepoTests } from './github-e2e';

/**
 * E2E حقيقي ضد GitHub (M2 — REAL EXTERNAL EXECUTION).
 * يعمل فقط عند الطلب الصريح: CELIA_E2E_REAL=1 + توفر GH_TOKEN.
 * (لا يعمل في CI الافتراضي حتى لا ننشئ PRs عشوائية.)
 */
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const enabled = Boolean(token) && process.env.CELIA_E2E_REAL === '1';
const reportDir = process.env.CELIA_E2E_REPORT_DIR ?? '.e2e-artifacts';

function writeReport(outcome: Awaited<ReturnType<typeof runGithubE2E>>): void {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(`${reportDir}/report.json`, JSON.stringify(outcome, null, 2));
  const checks = outcome.checks.map((check) => `- ${check.verdict}: ${check.name}${check.detail ? ` — ${check.detail}` : ''}`).join('\n');
  writeFileSync(
    `${reportDir}/report.md`,
    [
      '# Real GitHub E2E Report',
      '',
      `- Verdict: **${outcome.verdict}**`,
      `- PR: ${outcome.prUrl ?? 'not created'}`,
      `- Commit: ${outcome.commitSha ?? 'not created'}`,
      `- Chain valid: **${outcome.chainValid}**`,
      `- Merkle root: \`${outcome.merkleRoot}\``,
      '',
      '## Verification checks',
      checks || '- No checks recorded',
      '',
      '## Executed actions',
      outcome.executedActions.map((action) => `- \`${action}\``).join('\n') || '- None',
    ].join('\n'),
  );
}

describe.skipIf(!enabled)('REAL GitHub E2E (M2)', () => {
  it(
    'inspects the repo, opens a PR changing a specific file, and verifies with evidence',
    async () => {
      const stamp = Date.now();
      const outcome = await runGithubE2E({
        token: token!,
        owner: process.env.CELIA_E2E_OWNER ?? 'elazamey',
        repo: process.env.CELIA_E2E_REPO ?? 'chat.ai',
        branch: `e2e/m2-${stamp}`,
        readPath: 'README.md',
        writePath: `docs/e2e/M2-${stamp}.md`,
        fileContent: `# M2 E2E verification\n\nCreated by AOK LocalRunner + GitHub Adapter at ${new Date().toISOString()}.\n`,
        commitMessage: 'M2 E2E verification',
        prTitle: 'M2 E2E verification (auto)',
        prBody: 'This PR was created programmatically by the AOK kernel to prove the real external boundary (M2).',
        evidenceDir: reportDir,
        runTests: () => runRepoTests(),
      });
      writeReport(outcome);

      // معيار القبول M2
      expect(outcome.verdict).toBe('PASSED');
      expect(outcome.chainValid).toBe(true); // 100% side effects ledgered + chain intact
      expect(outcome.checks.find((c) => c.name === 'expected diff')?.verdict).toBe('PASSED');
      expect(outcome.ledgerEventTypes).toContain('ApprovalRequired');
      expect(outcome.ledgerEventTypes).toContain('ApprovalGranted');
      expect(outcome.executedActions).toContain('github.pull_request.create');
      expect(outcome.executedActions).toContain('github.repo.file.write');
      expect(outcome.ledgerEventTypes).toContain('VerificationCompleted');
    },
    180_000,
  );
});
