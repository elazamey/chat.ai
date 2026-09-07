import { createHash } from 'node:crypto';
import type { GenesisRecord } from '@aok/contracts';

/**
 * صيغة الـgenesis hash (PROVENANCE_CONTRACT):
 *   sha256([id, name, namespace, owner, repo-owner, genesis-commit])
 * حتمية وقابلة لإعادة الحساب — أي تعديل على الهوية يغيّر الـhash.
 */
export function computeGenesisHash(input: {
  projectId: string;
  name: string;
  namespace: string;
  primaryOwner: string;
  repositoryOwner: string;
  genesisCommit: string;
}): string {
  const canonical = JSON.stringify([
    input.projectId,
    input.name,
    input.namespace,
    input.primaryOwner,
    input.repositoryOwner,
    input.genesisCommit,
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}

/** يتحقق من أن الـgenesis hash المُعلن يطابق الحساب. */
export function verifyGenesis(record: GenesisRecord): { valid: boolean; expected: string } {
  const expected = computeGenesisHash({
    projectId: record.projectId,
    name: record.name,
    namespace: record.namespace,
    primaryOwner: record.primaryOwner,
    repositoryOwner: record.repositoryOwner,
    genesisCommit: record.genesisCommit,
  });
  return { valid: record.genesisHash === expected, expected };
}
