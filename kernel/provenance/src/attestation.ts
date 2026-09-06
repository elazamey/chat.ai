import { createHash } from 'node:crypto';
import type { ArtifactAttestation } from '@aok/contracts';

/** sha256 لمحتوى artifact (إثبات المصدر). */
export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * إثبات مصدر artifact: source → commit → build → artifact → sha256 + sbom ref.
 * مطابق للهيكل المستخدم في Artifact Attestations (مع إمكانية التحقق محليًا).
 */
export function attestArtifact(input: {
  path: string;
  content: string | Buffer;
  sourceCommit: string;
  sbomRef: string;
  attestedAt?: string;
}): ArtifactAttestation {
  return {
    path: input.path,
    sha256: sha256(input.content),
    sourceCommit: input.sourceCommit,
    sbomRef: input.sbomRef,
    attestedAt: input.attestedAt ?? new Date().toISOString(),
    evidence: [{ evidenceId: `attestation:${input.path}`, kind: 'artifact' }],
  };
}
