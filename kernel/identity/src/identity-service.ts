import { randomUUID } from 'node:crypto';
import type { SecretRef } from '@aok/contracts';
import type {
  IdentityEvent,
  IdentityEventActor,
  IdentityEventPayload,
  TokenIssuedPayload,
} from './events';
import type {
  AuthenticatedPrincipal,
  IdentityState,
  Membership,
  Organization,
  Session,
  TokenDescriptor,
  User,
} from './types';

const emptyState = (): IdentityState => ({
  organizations: [],
  users: [],
  memberships: [],
  sessions: [],
  tokens: [],
});

export interface IdentityServiceOptions {
  now?: () => string;
  id?: () => string;
}

/**
 * In-memory identity aggregate for the first M8 increment.
 * It owns identity invariants and emits replayable domain events; persistence
 * and PolicyEngine integration are intentionally deferred to later commits.
 */
export class IdentityService {
  private readonly now: () => string;
  private readonly id: () => string;
  private stateValue = emptyState();
  private readonly eventLog: IdentityEvent[] = [];

  constructor(options: IdentityServiceOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.id = options.id ?? randomUUID;
  }

  get state(): IdentityState {
    return {
      organizations: [...this.stateValue.organizations],
      users: [...this.stateValue.users],
      memberships: [...this.stateValue.memberships],
      sessions: [...this.stateValue.sessions],
      tokens: [...this.stateValue.tokens],
    };
  }

  get events(): readonly IdentityEvent[] {
    return [...this.eventLog];
  }

  createOrganization(actor: IdentityEventActor, name: string): Organization {
    const organization: Organization = { id: this.id(), name, createdAt: this.now() };
    this.append('identity.organization.created', actor, { organizationId: organization.id, name });
    this.stateValue = { ...this.stateValue, organizations: [...this.stateValue.organizations, organization] };
    return organization;
  }

  createUser(actor: IdentityEventActor, email: string, displayName: string): User {
    this.requireOrganization(actor.organizationId);
    const user: User = {
      id: this.id(),
      organizationId: actor.organizationId,
      email,
      displayName,
      createdAt: this.now(),
      status: 'active',
    };
    this.append('identity.user.created', actor, {
      userId: user.id,
      organizationId: user.organizationId,
      email,
      displayName,
    });
    this.stateValue = { ...this.stateValue, users: [...this.stateValue.users, user] };
    return user;
  }

  grantMembership(actor: IdentityEventActor, userId: string, roles: readonly string[]): Membership {
    this.requireOrganization(actor.organizationId);
    const user = this.requireUser(userId);
    if (user.organizationId !== actor.organizationId) throw new Error('cross-tenant membership is denied');
    const membership: Membership = {
      id: this.id(),
      organizationId: actor.organizationId,
      userId,
      roles: [...new Set(roles)],
      status: 'active',
      createdAt: this.now(),
    };
    this.append('identity.membership.granted', actor, {
      membershipId: membership.id,
      organizationId: membership.organizationId,
      userId,
    });
    for (const role of membership.roles) {
      this.append('identity.role.assigned', actor, {
        membershipId: membership.id,
        organizationId: membership.organizationId,
        userId,
        role,
      });
    }
    this.stateValue = { ...this.stateValue, memberships: [...this.stateValue.memberships, membership] };
    return membership;
  }

  createSession(actor: IdentityEventActor, userId: string, expiresAt: string): Session {
    this.requireOrganization(actor.organizationId);
    const user = this.requireUser(userId);
    if (user.organizationId !== actor.organizationId) throw new Error('cross-tenant session is denied');
    const membership = this.stateValue.memberships.find(
      (candidate) => candidate.userId === userId && candidate.organizationId === actor.organizationId && candidate.status === 'active',
    );
    if (!membership) throw new Error('active membership is required');
    const session: Session = {
      id: this.id(),
      organizationId: actor.organizationId,
      userId,
      status: 'active',
      createdAt: this.now(),
      expiresAt,
    };
    this.append('identity.session.created', actor, {
      sessionId: session.id,
      organizationId: session.organizationId,
      userId: session.userId,
      expiresAt,
    });
    this.stateValue = { ...this.stateValue, sessions: [...this.stateValue.sessions, session] };
    return session;
  }

  issueToken(actor: IdentityEventActor, sessionId: string, secretRef: SecretRef, expiresAt: string): TokenDescriptor {
    const session = this.requireSession(sessionId);
    this.requireSameOrganization(actor.organizationId, session.organizationId);
    const token: TokenDescriptor = {
      id: this.id(),
      sessionId,
      organizationId: session.organizationId,
      userId: session.userId,
      secretRef,
      issuedAt: this.now(),
      expiresAt,
    };
    this.appendToken('identity.token.issued', actor, token);
    this.stateValue = { ...this.stateValue, tokens: [...this.stateValue.tokens, token] };
    return token;
  }

  authenticate(tokenId: string): AuthenticatedPrincipal {
    const token = this.stateValue.tokens.find((candidate) => candidate.id === tokenId);
    if (!token || token.revokedAt) throw new Error('token is revoked or unknown');
    const session = this.requireSession(token.sessionId);
    if (session.status !== 'active' || new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new Error('session is expired or revoked');
    }
    const membership = this.stateValue.memberships.find(
      (candidate) =>
        candidate.organizationId === token.organizationId &&
        candidate.userId === token.userId &&
        candidate.status === 'active',
    );
    if (!membership) throw new Error('active membership is required');
    return {
      id: token.userId,
      organizationId: token.organizationId,
      sessionId: token.sessionId,
      tokenId: token.id,
      roles: [...membership.roles],
      trust: 'unknown',
    };
  }

  private append<T extends IdentityEventPayload>(type: IdentityEvent<T>['type'], actor: IdentityEventActor, payload: T): void {
    this.eventLog.push({ type, occurredAt: this.now(), actor, payload });
  }

  private appendToken(type: 'identity.token.issued', actor: IdentityEventActor, token: TokenDescriptor): void {
    const payload: TokenIssuedPayload = {
      tokenId: token.id,
      sessionId: token.sessionId,
      organizationId: token.organizationId,
      userId: token.userId,
      secretRef: token.secretRef,
      expiresAt: token.expiresAt,
    };
    this.append(type, actor, payload);
  }

  private requireActor(actor: IdentityEventActor): void {
    this.requireOrganization(actor.organizationId);
  }

  private requireOrganization(id: string): Organization {
    const organization = this.stateValue.organizations.find((candidate) => candidate.id === id);
    if (!organization) throw new Error(`organization '${id}' not found`);
    return organization;
  }

  private requireUser(id: string): User {
    const user = this.stateValue.users.find((candidate) => candidate.id === id);
    if (!user) throw new Error(`user '${id}' not found`);
    return user;
  }

  private requireSession(id: string): Session {
    const session = this.stateValue.sessions.find((candidate) => candidate.id === id);
    if (!session) throw new Error(`session '${id}' not found`);
    return session;
  }

  private requireSameOrganization(expected: string, actual: string): void {
    if (expected !== actual) throw new Error('cross-tenant access is denied');
  }
}
