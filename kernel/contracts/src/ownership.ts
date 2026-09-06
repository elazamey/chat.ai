import type { EvidenceRef } from './events';

/** أحداث الملكية (Ownership Ledger) — الملكية جزء من event history. */
export const OWNERSHIP_EVENT_TYPES = [
  'ownership.project.created',
  'ownership.source.authored',
  'ownership.contribution.accepted',
  'ownership.license.declared',
  'ownership.release.signed',
  'ownership.artifact.attested',
  'ownership.plugin.registered',
  'ownership.transfer.recorded',
] as const;

export type OwnershipEventType = (typeof OWNERSHIP_EVENT_TYPES)[number];

/** سجل التكوين (Genesis Record) — أول أصل رسمي. */
export interface GenesisRecord {
  projectId: string;
  name: string;
  namespace: string;
  primaryOwner: string;
  repositoryOwner: string;
  repository: string;
  genesisCommit: string;
  genesisTimestamp: string;
  architectureGenesisCommit: string;
  license: string;
  /** sha256([id, name, namespace, owner, repo-owner, genesis-commit]) */
  genesisHash: string;
}

/** إثبات مصدر artifact (attestation). */
export interface ArtifactAttestation {
  path: string;
  sha256: string;
  sourceCommit: string;
  sbomRef: string;
  attestedAt: string;
  evidence: EvidenceRef[];
}
