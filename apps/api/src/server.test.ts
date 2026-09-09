import { afterEach, describe, expect, it } from 'vitest';
import { createApiServer } from './server';

const servers: ReturnType<typeof createApiServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function request(path: string, init?: RequestInit) {
  const server = createApiServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server did not bind');
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe('HTTP API', () => {
  it('returns service health without invoking a model', async () => {
    const response = await request('/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'celia-api',
      mode: 'local',
    });
  });

  it('validates the run body', async () => {
    const response = await request('/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: '' }),
    });
    expect(response.status).toBe(400);
  });

  it('reaches the current runner and preserves a failed verdict', async () => {
    const response = await request('/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: 'free deployment smoke' }),
    });
    const result = (await response.json()) as { verdict?: string; run_id?: string };
    expect(response.status).toBe(200);
    expect(result.verdict).toBe('FAILED');
    expect(result.run_id).toEqual(expect.any(String));
  });

  it('rejects unknown routes and methods', async () => {
    expect((await request('/unknown')).status).toBe(404);
    expect((await request('/health', { method: 'POST' })).status).toBe(405);
  });
});
