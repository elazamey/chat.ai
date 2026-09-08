import type { SecretRef } from '@aok/contracts';
import type {
  MembershipId,
  OrganizationId,
  SessionId,
  TokenId,
  UserId,
} from './types';

export const IDENTITY_EVENT_TYPES = [
  'identity.organization.created',
  'identity.user.created',
  'identity.membership.granted',
  'identity.membership.revoked',
  'identity.role.assigned',
  'identity.role.removed',
  'identity.session.created',
  'identity.token.issued',
  'identity.token.rotated',
  'identity.token.revoked',
] as const;

export type IdentityEventType = (typeof IDENTITY_EVENT_TYPES)[number];

export interface IdentityEventActor {
  principalId: UserId;
  organizationId: OrganizationId;
  sessionId?: SessionId;
}

export interface OrganizationCreatedPayload {
  organizationId: OrganizationId;
  name: string;
}

export interface UserCreatedPayload {
  userId: UserId;
  organizationId: OrganizationId;
  email: string;
  displayName: string;
}

export interface MembershipChangedPayload {
  membershipId: MembershipId;
  organizationId: OrganizationId;
  userId: UserId;
  role?: string;
}

export interface SessionCreatedPayload {
  sessionId: SessionId;
  organizationId: OrganizationId;
  userId: UserId;
  expiresAt: string;
}

export interface TokenIssuedPayload {
  tokenId: TokenId;
  sessionId: SessionId;
  organizationId: OrganizationId;
  userId: UserId;
  secretRef: SecretRef;
  expiresAt: string;
}

export interface TokenRotatedPayload extends TokenIssuedPayload {
  replacedTokenId: TokenId;
}

export interface TokenRevokedPayload {
  tokenId: TokenId;
  sessionId: SessionId;
  organizationId: OrganizationId;
  userId: UserId;
  reason: string;
}

export type IdentityEventPayload =
  | OrganizationCreatedPayload
  | UserCreatedPayload
  | MembershipChangedPayload
  | SessionCreatedPayload
  | TokenIssuedPayload
  | TokenRotatedPayload
  | TokenRevokedPayload;

/**
 * Domain events deliberately contain only SecretRef metadata, never credentials.
 * Persistence adapters can map this envelope to the append-only Ledger later.
 */
export interface IdentityEvent<T extends IdentityEventPayload = IdentityEventPayload> {
  type: IdentityEventType;
  occurredAt: string;
  actor: IdentityEventActor;
  payload: T;
}
