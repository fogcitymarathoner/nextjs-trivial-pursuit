/**
 * @jest-environment node
 */

import { fetchWithRetry } from '../wiki_helpers';

describe('wiki_helpers non-test branch', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    // Use fake timers to control sleep()
    jest.useFakeTimers();
    // Ensure we run the non-test branch
    process.env.NODE_ENV = 'production';
    process.env.WIKI_HELPERS_RETRY_BASE_MS = '10';
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NODE_ENV = originalEnv;
    delete process.env.WIKI_HELPERS_RETRY_BASE_MS;
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
    } as any;

    const successResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ title: 'A', extract: 'B' }),
    } as any;

    const mockFetch = jest.fn()
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    // @ts-ignore
    global.fetch = mockFetch;

    const p = fetchWithRetry<{ title: string }>('http://example', {});

    // advance timers to allow retry-after sleep (1s)
    jest.advanceTimersByTime(1000);
    if (typeof (jest as any).runAllTimersAsync === 'function') {
      await (jest as any).runAllTimersAsync();
    } else {
      jest.runOnlyPendingTimers();
    }
    // allow microtasks
    await Promise.resolve();

    const result = await p;
    expect(result.title).toBe('A');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails after max retries on HTTP error', async () => {
    // Use real timers here because final rejection is scheduled with setImmediate
    jest.useRealTimers();
    const badResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({}),
    } as any;

    const mockFetch = jest.fn().mockResolvedValue(badResponse);
    // @ts-ignore
    global.fetch = mockFetch;

    const p = fetchWithRetry('http://example', {}, 3);

    // advance through retries (base ms=10, doubled each time)
    jest.advanceTimersByTime(10);
    if (typeof (jest as any).runAllTimersAsync === 'function') {
      await (jest as any).runAllTimersAsync();
    } else {
      jest.runOnlyPendingTimers();
    }
    await Promise.resolve();

    jest.advanceTimersByTime(20);
    if (typeof (jest as any).runAllTimersAsync === 'function') {
      await (jest as any).runAllTimersAsync();
    } else {
      jest.runOnlyPendingTimers();
    }
    await Promise.resolve();

    jest.advanceTimersByTime(40);
    if (typeof (jest as any).runAllTimersAsync === 'function') {
      await (jest as any).runAllTimersAsync();
    } else {
      jest.runOnlyPendingTimers();
    }
    await Promise.resolve();

    await expect(p).rejects.toThrow(/Failed after 3 attempts/);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
