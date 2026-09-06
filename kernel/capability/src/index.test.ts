import { describe, it, expect } from 'vitest';
import { spec, compose, has } from './index';

describe('capability composition (fission)', () => {
  it('builds a SoftwareEngineer capability set from primitives', () => {
    const softwareEngineer = compose('software-engineer', [
      spec('repo.read'),
      spec('repo.write'),
      spec('git.commit'),
      spec('github.pull_request.create'),
      spec('test.run'),
    ]);
    expect(softwareEngineer.capabilities.map((c) => c.action)).toEqual([
      'repo.read',
      'repo.write',
      'git.commit',
      'github.pull_request.create',
      'test.run',
    ]);
  });

  it('composes higher sets from lower sets (ReleaseEngineer)', () => {
    const softwareEngineer = compose('software-engineer', [
      spec('repo.read'),
      spec('repo.write'),
      spec('git.commit'),
      spec('github.pull_request.create'),
      spec('test.run'),
    ]);
    const releaseEngineer = compose('release-engineer', softwareEngineer, [
      spec('deploy.staging'),
      spec('browser.verify'),
    ]);
    expect(has(releaseEngineer, 'repo.read')).toBe(true);
    expect(has(releaseEngineer, 'deploy.staging')).toBe(true);
    expect(releaseEngineer.capabilities).toHaveLength(7);
  });

  it('builds an AutonomousProjectAgent from Research+Coding+Browser+Verification', () => {
    const agent = compose(
      'autonomous-project-agent',
      [spec('research.search'), spec('research.read')],
      [spec('code.edit'), spec('test.run')],
      [spec('browser.navigate'), spec('browser.verify')],
      [spec('verification.check')],
    );
    expect(agent.capabilities.map((c) => c.action)).toHaveLength(7);
  });

  it('de-duplicates overlapping capabilities', () => {
    const s = compose('s', [spec('repo.read'), spec('repo.read'), spec('repo.write')]);
    expect(s.capabilities).toHaveLength(2);
  });

  it('attaches constraints to capabilities (approval gates)', () => {
    const deploy = spec('deploy.production', 'env:prod', [{ kind: 'approval', value: 'always' }]);
    expect(deploy.constraints).toEqual([{ kind: 'approval', value: 'always' }]);
    expect(deploy.scope).toBe('env:prod');
  });
});
