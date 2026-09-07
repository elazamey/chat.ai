import { describe, it, expect } from 'vitest';
import { computeGenesisHash, verifyGenesis, sha256, attestArtifact, OwnershipLedger } from './index';
import type { GenesisRecord } from '@aok/contracts';

const identity = {
  projectId: 'celia-kernel',
  name: 'Celia',
  namespace: 'com.celia',
  primaryOwner: 'elazamey',
  repositoryOwner: 'elazamey',
  genesisCommit: '5a40a841a4db459521b404e19e30e1a7971b5770',
};

describe('genesis (provenance)', () => {
  it('is deterministic and matches the declared PROJECT_IDENTITY genesis hash', () => {
    // القيمة المعلنة في PROJECT_IDENTITY.yaml
    const declared = '06a6665315ddce4b55bd3136486aabd23d337609bf4a90ef179e8e4ff4b97033';
    expect(computeGenesisHash(identity)).toBe(declared);
  });

  it('changes when any identity field changes (tamper detection)', () => {
    const h1 = computeGenesisHash(identity);
    const h2 = computeGenesisHash({ ...identity, primaryOwner: 'attacker' });
    expect(h1).not.toBe(h2);
  });

  it('verifies a full GenesisRecord', () => {
    const record: GenesisRecord = {
      ...identity,
      repository: 'github.com/elazamey/chat.ai',
      genesisTimestamp: '2026-09-06T22:27:04+00:00',
      architectureGenesisCommit: '57931300fd88aa50f47137d78c17c6f3838bcd87',
      license: 'Apache-2.0',
      genesisHash: computeGenesisHash(identity),
    };
    expect(verifyGenesis(record)).toEqual({ valid: true, expected: record.genesisHash });
  });
});

describe('attestation (provenance)', () => {
  it('hashes content deterministically and matches node:crypto', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('hello')).toHaveLength(64);
  });

  it('attests an artifact with sha256 + source commit + sbom ref', () => {
    const a = attestArtifact({
      path: 'dist/celia.js',
      content: 'export const x=1',
      sourceCommit: 'abc123',
      sbomRef: 'sbom.json',
    });
    expect(a.sha256).toBe(sha256('export const x=1'));
    expect(a.sourceCommit).toBe('abc123');
    expect(a.evidence[0]?.kind).toBe('artifact');
  });
});

describe('OwnershipLedger', () => {
  it('records ownership events as an append-only hash chain', () => {
    const l = new OwnershipLedger();
    l.append('ownership.project.created', { id: 'celia-kernel' });
    l.append('ownership.license.declared', { license: 'Apache-2.0' });
    expect(l.events().map((e) => e.type)).toEqual([
      'ownership.project.created',
      'ownership.license.declared',
    ]);
    expect(l.verifyIntegrity()).toEqual({ valid: true });
  });
});
