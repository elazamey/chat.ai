import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { SchemaRegistry, InvalidNameError, UnregisteredCapabilityError } from './index';
import { validateName, validateCapabilityName, namespaceOf, RESERVED_NAMESPACES } from '@aok/contracts';

describe('naming convention (Namespace + Action)', () => {
  it('accepts valid dotted lowercase names', () => {
    expect(validateCapabilityName('github.repo.read').valid).toBe(true);
    expect(validateCapabilityName('github.pull_request.create').valid).toBe(true);
    expect(validateCapabilityName('filesystem.file.read').valid).toBe(true);
    expect(validateCapabilityName('deploy.staging').valid).toBe(true);
  });

  it('rejects reserved namespaces (no admin.superpower / everything.allow)', () => {
    expect(validateCapabilityName('admin.superpower').valid).toBe(false);
    expect(validateCapabilityName('everything.allow').valid).toBe(false);
    expect(validateCapabilityName('sudo.bypass').valid).toBe(false);
    expect(validateCapabilityName('admin.superpower').reason).toContain('reserved');
  });

  it('rejects malformed names', () => {
    expect(validateName('GitHub.Repo.Read').valid).toBe(false); // أحرف كبيرة
    expect(validateName('github..read').valid).toBe(false); // نقطة مزدوجة
    expect(validateName('github').valid).toBe(false); // قسم واحد
    expect(validateName('.github.read').valid).toBe(false); // يبدأ بنقطة
  });

  it('extracts the namespace', () => {
    expect(namespaceOf('github.pull_request.create')).toBe('github');
    expect(namespaceOf('deploy.staging')).toBe('deploy');
  });

  it('has a reserved-namespace list', () => {
    expect((RESERVED_NAMESPACES as readonly string[])).toContain('admin');
  });
});

describe('SchemaRegistry (Namespace + Schema Registry)', () => {
  const registry = () => {
    const r = new SchemaRegistry();
    r.registerCapability('github.repo.read', z.object({ owner: z.string(), repo: z.string() }), z.any());
    r.registerEvent('github.pr.created', z.object({ number: z.number() }));
    return r;
  };

  it('registers capabilities and events with valid names', () => {
    const r = registry();
    expect(r.hasCapability('github.repo.read')).toBe(true);
    expect(r.namespaces()).toContain('github');
  });

  it('rejects invalid/reserved names at registration time', () => {
    const r = new SchemaRegistry();
    expect(() => r.registerCapability('admin.superpower', z.any(), z.any())).toThrow(InvalidNameError);
  });

  it('rejects unregistered capabilities at execution time', () => {
    const r = registry();
    expect(() => r.validateCapabilityInput('github.pr.create', {})).toThrow(UnregisteredCapabilityError);
    expect(() => r.assertCapabilityRegistered('github.pr.create')).toThrow(UnregisteredCapabilityError);
  });

  it('parses and validates inputs against the schema', () => {
    const r = registry();
    expect(() => r.validateCapabilityInput('github.repo.read', {})).toThrow(); // owner/repo مفقودان
    expect(r.validateCapabilityInput('github.repo.read', { owner: 'o', repo: 'r' })).toEqual({ owner: 'o', repo: 'r' });
  });

  it('validates event payloads against their schema', () => {
    const r = registry();
    expect(r.validateEventPayload('github.pr.created', { number: 7 })).toEqual({ number: 7 });
    expect(() => r.validateEventPayload('github.pr.created', { nope: 1 })).toThrow();
  });
});
