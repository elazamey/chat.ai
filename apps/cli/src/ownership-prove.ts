import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { computeGenesisHash, OwnershipLedger } from '@aok/provenance';

/**
 * celia ownership prove — يصدر حزمة إثبات تقنية (Provenance Proof Bundle).
 *
 * ليست "شهادة ملكية قانونية" تلقائية؛ بل دليل تقني منظم على الهوية والنسب
 * والتسلسل الزمني والمصدر (PROVENANCE_CONTRACT).
 */

export interface OwnershipProofSummary {
  outputDir: string;
  files: string[];
  genesisHashDeclared: string;
  genesisHashComputed: string;
  genesisValid: boolean;
  chainValid: boolean;
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function gitHistory(root: string): { commit: string; author: string; email: string; date: string; subject: string }[] {
  const fmt = '%H\u0001%an\u0001%ae\u0001%aI\u0001%s';
  const out = execSync(`git log --format='${fmt}' -n 500`, { cwd: root, encoding: 'utf8' });
  return out
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const [commit, author, email, date, subject] = line.split('\u0001');
      return { commit: commit!, author: author!, email: email!, date: date!, subject: subject! };
    });
}

const TOP_CONTRACTS = [
  'KERNEL_CONSTITUTION.md',
  'ATOMIC_KERNEL_CONTRACT.md',
  'ZERO_COST_ECONOMIC_CONTRACT.md',
  'SECURITY_CONTRACT.md',
  'OWNERSHIP_CONTRACT.md',
  'PROVENANCE_CONTRACT.md',
];

/** يقرأ PROJECT_IDENTITY.yaml ويُعيد بنية معرّفة. */
export interface ProjectIdentity {
  project: {
    id: string;
    name: string;
    namespace: string;
    genesis_commit: string;
    architecture_genesis_commit: string;
    created_at: string;
  };
  ownership: { primary_owner: string; repository_owner: string; organization?: string };
  license: { core: string; proprietary?: string };
  provenance: { genesis_commit: string; genesis_hash: string; provenance_required: boolean; signing_required: boolean };
}

export function loadIdentity(root: string): ProjectIdentity {
  const raw = readFileSync(join(root, 'PROJECT_IDENTITY.yaml'), 'utf8');
  return parseYaml(raw) as ProjectIdentity;
}

export function buildOwnershipProof(root: string, outputDir?: string): OwnershipProofSummary {
  const identity = loadIdentity(root);
  const outDir = outputDir ?? join(root, 'ownership-proof');
  mkdirSync(outDir, { recursive: true });

  const genesisHashComputed = computeGenesisHash({
    projectId: identity.project.id,
    name: identity.project.name,
    namespace: identity.project.namespace,
    primaryOwner: identity.ownership.primary_owner,
    repositoryOwner: identity.ownership.repository_owner,
    genesisCommit: identity.project.genesis_commit,
  });
  const genesisValid = genesisHashComputed === identity.provenance.genesis_hash;

  const history = gitHistory(root);

  // هوية المشروع (من الـyaml)
  writeFileSync(join(outDir, 'project-identity.json'), JSON.stringify(identity, null, 2));

  // Genesis record
  writeFileSync(
    join(outDir, 'genesis.json'),
    JSON.stringify(
      {
        projectId: identity.project.id,
        name: identity.project.name,
        namespace: identity.project.namespace,
        primaryOwner: identity.ownership.primary_owner,
        repositoryOwner: identity.ownership.repository_owner,
        repository: 'github.com/elazamey/chat.ai',
        genesisCommit: identity.project.genesis_commit,
        genesisTimestamp: identity.project.created_at,
        architectureGenesisCommit: identity.project.architecture_genesis_commit,
        license: identity.license.core,
        genesisHash: identity.provenance.genesis_hash,
        genesisHashComputed,
        genesisValid,
      },
      null,
      2,
    ),
  );

  // تاريخ git
  writeFileSync(join(outDir, 'git-history.json'), JSON.stringify(history, null, 2));
  writeFileSync(
    join(outDir, 'commits.json'),
    JSON.stringify({ total: history.length, commits: history.map((h) => h.commit) }, null, 2),
  );

  // إصدار (قالب فارغ حتى أول release)
  writeFileSync(
    join(outDir, 'release.json'),
    JSON.stringify({ latest: null, releases: [] }, null, 2),
  );

  // hashes العقود العليا
  const architectureHashes: Record<string, string> = {};
  for (const doc of TOP_CONTRACTS) {
    const p = join(root, 'docs', doc);
    try {
      architectureHashes[doc] = sha256File(p);
    } catch {
      architectureHashes[doc] = 'MISSING';
    }
  }
  writeFileSync(join(outDir, 'architecture-hashes.json'), JSON.stringify(architectureHashes, null, 2));

  // artifact hash للـLICENSE + الهوية
  writeFileSync(
    join(outDir, 'artifact-hash.json'),
    JSON.stringify(
      {
        LICENSE: sha256File(join(root, 'LICENSE')),
        PROJECT_IDENTITY_yaml: sha256File(join(root, 'PROJECT_IDENTITY.yaml')),
        PROJECT_GENESIS_md: sha256File(join(root, 'PROJECT_GENESIS.md')),
      },
      null,
      2,
    ),
  );

  // SBOM مصغّر: أسماء حزم الـworkspace
  const sbom = execSync("git ls-files '*/package.json' 'package.json'", { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((p) => {
      try {
        const pkg = JSON.parse(readFileSync(join(root, p), 'utf8')) as { name?: string; version?: string };
        return { name: pkg.name, version: pkg.version };
      } catch {
        return { name: p, version: null };
      }
    });
  writeFileSync(join(outDir, 'sbom.json'), JSON.stringify(sbom, null, 2));

  // Ownership ledger export (إعادة بناء من الأحداث)
  const ledger = new OwnershipLedger();
  ledger.append('ownership.project.created', {
    id: identity.project.id,
    genesisCommit: identity.project.genesis_commit,
    genesisHash: identity.provenance.genesis_hash,
  });
  ledger.append('ownership.license.declared', { license: identity.license.core });
  ledger.append('ownership.source.authored', { genesisCommit: identity.project.genesis_commit, commits: history.length });
  writeFileSync(
    join(outDir, 'ledger-export.json'),
    JSON.stringify({ events: ledger.events(), chainValid: ledger.verifyIntegrity().valid }, null, 2),
  );

  const files = [
    'project-identity.json',
    'genesis.json',
    'git-history.json',
    'commits.json',
    'release.json',
    'architecture-hashes.json',
    'artifact-hash.json',
    'sbom.json',
    'ledger-export.json',
  ];

  return {
    outputDir: outDir,
    files,
    genesisHashDeclared: identity.provenance.genesis_hash,
    genesisHashComputed,
    genesisValid,
    chainValid: ledger.verifyIntegrity().valid,
  };
}
