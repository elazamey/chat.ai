import { afterEach, describe, expect, it, vi } from 'vitest';
import { runTask, RunRequestError } from './api';

afterEach(() => vi.restoreAllMocks());

describe('runTask', () => {
  it('surfaces network failures with a user-facing message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(runTask('test')).rejects.toMatchObject({
      kind: 'network',
      message: expect.stringContaining('تعذر الوصول إلى خدمة التنفيذ'),
    });
  });

  it('rejects malformed successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verdict: 'PASSED' }), { status: 200 }),
    ));

    await expect(runTask('test')).rejects.toMatchObject({
      kind: 'invalid_response',
      message: expect.stringContaining('استجابة التنفيذ ناقصة'),
    });
  });

  it('classifies an API rejection separately from transport failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'blocked by policy' }), { status: 403 }),
    ));

    await expect(runTask('test')).rejects.toEqual(
      expect.objectContaining({
        name: 'RunRequestError',
        kind: 'api_rejected',
        message: 'blocked by policy',
      } satisfies Partial<RunRequestError>),
    );
  });
});
