import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOwnershipProof, loadIdentity } from './ownership-prove';
import { computeGenesisHash } from '@aok/provenance';

describe('celia ownership prove (Provenance Proof Bundle)', () => {
  it('loads PROJECT_IDENTITY and reproduces the declared genesis hash', () => {
    const identity = loadIdentity(process.cwd());
    expect(identity.project.id).toBe('celia-kernel');
    const computed = computeGenesisHash({
      projectId: identity.project.id,
      name: identity.project.name,
      namespace: identity.project.namespace,
      primaryOwner: identity.ownership.primary_owner,
      repositoryOwner: identity.ownership.repository_owner,
      genesisCommit: identity.project.genesis_commit,
    });
    expect(computed).toBe(identity.provenance.genesis_hash);
  });

  it('emits the full proof bundle with a valid chain', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'celia-proof-'));
    const proof = buildOwnershipProof(process.cwd(), outDir);
    expect(proof.genesisValid).toBe(true);
    expect(proof.chainValid).toBe(true);
    for (const f of proof.files) {
      expect(join(outDir, f)).toBeTruthy();
    }
  });
});
