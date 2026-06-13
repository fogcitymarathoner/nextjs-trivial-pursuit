// Ensure setImmediate is available before importing module
type TestGlobal = {
  setImmediate?: (cb: (...args: unknown[]) => void) => ReturnType<typeof setTimeout>;
  fetch?: unknown;
};

if (typeof (global as unknown as TestGlobal).setImmediate === 'undefined') (global as unknown as TestGlobal).setImmediate = (cb: (...args: unknown[]) => void) => setTimeout(cb, 0);

import { fetchWithRetry, getWikiPage } from '../wiki_helpers';

describe('wiki_helpers extra branches', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    // ensure setImmediate is available in the test env (polyfill)
    if (typeof (global as unknown as TestGlobal).setImmediate === 'undefined') (global as unknown as TestGlobal).setImmediate = (cb: (...args: unknown[]) => void) => setTimeout(cb, 0);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fetchWithRetry should handle 429 then succeed (test mode)', async () => {
    const first = {
      status: 429,
      headers: { get: (_k?: string) => '1' },
      ok: false,
      json: async () => ({})
    } as unknown as Response;

    const second = {
      status: 200,
      headers: { get: (_k?: string) => null },
      ok: true,
      json: async () => ({ result: 'ok' })
    } as unknown as Response;

    (global as unknown as TestGlobal).fetch = jest.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const res = await fetchWithRetry<Record<string, unknown>>('https://example.com', {});
    expect(res).toEqual({ result: 'ok' });
  });

  it('fetchWithRetry should reject after max retries', async () => {
    (global as unknown as TestGlobal).fetch = jest.fn().mockRejectedValue(new Error('network-fail'));

    await expect(fetchWithRetry<Record<string, unknown>>('https://example.com', {}, 2)).rejects.toThrow('Failed after 2 attempts');
  });

  it('getWikiPage should return summary and handle full content fetch error', async () => {
    const summary = { title: 'T', extract: 'X' };

    // mock global.fetch to handle summary and html endpoints
    // first call is summary, second call for html will throw
    (global as unknown as TestGlobal).fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/summary/')) {
        return Promise.resolve({ ok: true, json: async () => summary, status: 200, headers: { get: () => null } } as unknown as Response);
      }
      if (url.includes('/html/')) {
        return Promise.reject(new Error('content-fail'));
      }
      return Promise.resolve({ ok: true, json: async () => summary, text: async () => '<html/>' } as unknown as Response);
    });

    const result = await getWikiPage('Some Title', true);
    expect(result.title).toBe('T');
    expect(result.fullContent).toBeUndefined();
  });
});
