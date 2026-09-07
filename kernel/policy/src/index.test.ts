import { describe, it, expect } from 'vitest';
import { PolicyEngine, scopeMatches } from './index';

describe('scopeMatches', () => {
  it('matches wildcard, exact and prefix patterns', () => {
    expect(scopeMatches('*', 'anything')).toBe(true);
    expect(scopeMatches('repo:elazamey/chat.ai', 'repo:elazamey/chat.ai')).toBe(true);
    expect(scopeMatches('repo:elazamey/chat.ai', 'repo:elazamey/other')).toBe(false);
    expect(scopeMatches('domain:*', 'domain:api.github.com')).toBe(true);
  });
});

describe('PolicyEngine', () => {
  const engine = () => new PolicyEngine();

  it('denies by default (no grant)', () => {
    const d = engine().evaluate('agent:coder', 'repo.read');
    expect(d.allowed).toBe(false);
  });

  it('allows auto capability with an allow grant (read)', () => {
    const e = engine();
    e.addGrant({ id: 'g1', principal: 'agent:coder', capability: 'repo.read', scope: '*', effect: 'allow' });
    const d = e.evaluate('agent:coder', 'repo.read', 'repo:elazamey/chat.ai');
    expect(d.allowed).toBe(true);
    expect(d.approvalRequired).toBe(false);
  });

  it('requires approval for git.push even with an allow grant (C13)', () => {
    const e = engine();
    e.addGrant({ id: 'g1', principal: 'agent:coder', capability: 'git.push', scope: '*', effect: 'allow' });
    const d = e.evaluate('agent:coder', 'git.push');
    expect(d.allowed).toBe(true);
    expect(d.approvalRequired).toBe(true);
  });

  it('deny always wins over allow (deny precedence)', () => {
    const e = engine();
    e.addGrant({ id: 'a', principal: 'agent:coder', capability: 'fs.write', scope: '*', effect: 'allow' });
    e.addGrant({ id: 'd', principal: 'agent:coder', capability: 'fs.write', scope: '/etc/**', effect: 'deny' });
    expect(e.evaluate('agent:coder', 'fs.write', '/etc/passwd').allowed).toBe(false);
    expect(e.evaluate('agent:coder', 'fs.write', '/workspace/x').allowed).toBe(true);
  });

  it('scopes grants to a specific resource', () => {
    const e = engine();
    e.addGrant({
      id: 'g1',
      principal: 'agent:coder',
      capability: 'repo.write',
      scope: 'repo:elazamey/chat.ai',
      effect: 'allow',
    });
    expect(e.evaluate('agent:coder', 'repo.write', 'repo:elazamey/chat.ai').allowed).toBe(true);
    expect(e.evaluate('agent:coder', 'repo.write', 'repo:other/x').allowed).toBe(false);
  });

  it('secret.read always requires approval', () => {
    const e = engine();
    e.addGrant({ id: 'g1', principal: 'agent:coder', capability: 'secret.read', scope: '*', effect: 'allow' });
    expect(e.evaluate('agent:coder', 'secret.read').approvalRequired).toBe(true);
  });
});
