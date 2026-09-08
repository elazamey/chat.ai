import type { SecretRef } from '@aok/contracts';

export type IdentityId = string;
export type OrganizationId = IdentityId;
export type UserId = IdentityId;
export type MembershipId = IdentityId;
export type SessionId = IdentityId;
export type TokenId = IdentityId;

export type MembershipStatus = 'active' | 'suspended' | 'revoked';
export type SessionStatus = 'active' | 'expired' | 'revoked';
export type TrustLevel = 'unknown' | 'verified' | 'trusted' | 'revoked';

export interface Organization {
  id: OrganizationId;
  name: string;
  createdAt: string;
}

export interface User {
  id: UserId;
  organizationId: OrganizationId;
  email: string;
  displayName: string;
  createdAt: string;
  status: 'active' | 'suspended' | 'deleted';
}

export interface Membership {
  id: MembershipId;
  organizationId: OrganizationId;
  userId: UserId;
  roles: readonly string[];
  status: MembershipStatus;
  createdAt: string;
  revokedAt?: string;
}

export interface Session {
  id: SessionId;
  organizationId: OrganizationId;
  userId: UserId;
  status: SessionStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

/**
 * A token is represented in identity state by metadata and a vault reference.
 * The credential value is intentionally not part of this contract.
 */
export interface TokenDescriptor {
  id: TokenId;
  sessionId: SessionId;
  organizationId: OrganizationId;
  userId: UserId;
  secretRef: SecretRef;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
  replacedBy?: TokenId;
}

export interface AuthenticatedPrincipal {
  id: UserId;
  organizationId: OrganizationId;
  sessionId: SessionId;
  tokenId: TokenId;
  roles: readonly string[];
  trust: TrustLevel;
}

export interface AuthorizationContext extends AuthenticatedPrincipal {
  capabilities: readonly string[];
}

export interface IdentityState {
  organizations: readonly Organization[];
  users: readonly User[];
  memberships: readonly Membership[];
  sessions: readonly Session[];
  tokens: readonly TokenDescriptor[];
}
