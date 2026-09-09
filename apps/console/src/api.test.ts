import { afterEach, describe, expect, it, vi } from 'vitest';
import { runTask } from './api';

afterEach(() => vi.restoreAllMocks());

describe('runTask', () => {
  it('surfaces network failures with a user-facing message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(runTask('test')).rejects.toThrow('تعذر الوصول إلى خدمة التنفيذ');
  });

  it('rejects malformed successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verdict: 'PASSED' }), { status: 200 }),
    ));

    await expect(runTask('test')).rejects.toThrow('استجابة التنفيذ ناقصة');
  });
});
