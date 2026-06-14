/**
 * @jest-environment node
 */

import { fetchWithRetry } from '../wiki_helpers';

describe('wiki_helpers non-test branch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Use fake timers to control sleep()
    jest.useFakeTimers();
    jest.replaceProperty(process, 'env', {
      ...originalEnv,
      NODE_ENV: 'development',
      WIKI_HELPERS_RETRY_BASE_MS: '10',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('retries on 429 with retry-after header then succeeds', async () => {
    const retryHeaders = new Headers();
    retryHeaders.set('retry-after', '1');

    const rateLimitResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: retryHeaders,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response;

    const successResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ title: 'A', extract: 'B' }),
    } as unknown as Response;

    const mockFetch = jest.fn()
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    global.fetch = mockFetch;

    const p = fetchWithRetry<{ title: string }>('http://example', {});

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);

    const result = await p;
    expect(result.title).toBe('A');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails after max retries on HTTP error', async () => {
    // Keep fake timers so we can advance the retry schedule deterministically
    const badResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response;

    const mockFetch = jest.fn().mockResolvedValue(badResponse);
    global.fetch = mockFetch;


    const p = fetchWithRetry('http://example', {}, 3);
    // Attach the rejection assertion early so the rejection is observed by the test harness
    const expectPromise = expect(p).rejects.toThrow(/Failed after 3 attempts/);

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10);
    await jest.advanceTimersByTimeAsync(20);
    await jest.runAllTimersAsync();

    await expectPromise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries network errors in non-test mode and then succeeds', async () => {
    const successResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ title: 'Recovered' }),
    } as unknown as Response;

    const mockFetch = jest.fn()
      .mockRejectedValueOnce(new Error('temporary-fail'))
      .mockResolvedValueOnce(successResponse);
    global.fetch = mockFetch;

    const p = fetchWithRetry<{ title: string }>('http://example', {}, 2);

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10);

    await expect(p).resolves.toEqual({ title: 'Recovered' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
