import { describe, expect, it } from 'vitest';
import { IdentityService } from './index';

function setup() {
  let counter = 0;
  const service = new IdentityService({
    id: () => `id-${++counter}`,
    now: () => '2026-09-08T00:00:00.000Z',
  });
  const bootstrap = { principalId: 'bootstrap', organizationId: 'pending' };
  const organization = service.createOrganization(bootstrap, 'Acme');
  const actor = { principalId: 'bootstrap', organizationId: organization.id };
  return { service, actor };
}

describe('@aok/identity', () => {
  it('creates a tenant-scoped user and authenticates only through an active membership', () => {
    const { service, actor } = setup();
    const user = service.createUser(actor, 'user@example.com', 'User');
    expect(() => service.createSession(actor, user.id, '2999-01-01T00:00:00.000Z')).toThrow(/membership/);

    service.grantMembership(actor, user.id, ['member']);
    const session = service.createSession(actor, user.id, '2999-01-01T00:00:00.000Z');
    const token = service.issueToken(actor, session.id, { id: 'vault:token', vault: 'test', key: 'token' }, '2999-01-01T00:00:00.000Z');
    expect(service.authenticate(token.id)).toMatchObject({
      id: user.id,
      organizationId: actor.organizationId,
      sessionId: session.id,
      tokenId: token.id,
      roles: ['member'],
    });
  });

  it('rejects cross-tenant operations', () => {
    const { service, actor } = setup();
    const other = service.createOrganization(actor, 'Other');
    const user = service.createUser({ ...actor, organizationId: other.id }, 'other@example.com', 'Other');
    expect(() => service.grantMembership(actor, user.id, ['admin'])).toThrow(/cross-tenant/);
  });

  it('keeps raw token values out of state and identity events', () => {
    const { service, actor } = setup();
    const user = service.createUser(actor, 'user@example.com', 'User');
    service.grantMembership(actor, user.id, ['member']);
    const session = service.createSession(actor, user.id, '2999-01-01T00:00:00.000Z');
    service.issueToken(actor, session.id, { id: 'vault:token', vault: 'test', key: 'token' }, '2999-01-01T00:00:00.000Z');
    const serialized = JSON.stringify({ state: service.state, events: service.events });
    expect(serialized).not.toContain('raw-token-value');
    expect(serialized).toContain('secretRef');
  });
});
