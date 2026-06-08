import { jest } from '@jest/globals';

describe('wiki_helpers fetchWithRetry & getWikiPage branches', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.WIKI_HELPERS_RETRY_BASE_MS;
  });

  test('getWikiPage throws on empty title', async () => {
    const { getWikiPage } = await import('../wiki_helpers');
    await expect(getWikiPage('')).rejects.toThrow('Title is required');
  });

  test('successfully returns summary (no full content)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ title: 'T', extract: 'E' })
    });

    const { getWikiPage } = await import('../wiki_helpers');
    const res = await getWikiPage('Some Title', false);
    expect(res.title).toBe('T');
    expect(res.summary).toBe('E');
  });

  test('getFullContent true fetches html and attaches fullContent', async () => {
    (global as any).fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/summary/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ title: 'T', extract: 'E' }) });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '<html/>' });
    });

    const { getWikiPage } = await import('../wiki_helpers');
    const res = await getWikiPage('Some Title', true);
    expect(res.fullContent).toBe('<html/>');
  });

  test('handles 429 then success (test mode retries immediately)', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null } })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ title: 'T2', extract: 'E2' }) });

    (global as any).fetch = mockFetch;

    const { fetchWithRetry } = await import('../wiki_helpers');
    const res = await fetchWithRetry('/summary/x', {} as any, 3);
    expect(res.title).toBe('T2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('fetch throws non-Error value and ultimately rejects with stringified message', async () => {
    const mockFetch = jest.fn().mockRejectedValue('boom');
    (global as any).fetch = mockFetch;

    const { fetchWithRetry } = await import('../wiki_helpers');
    await expect(fetchWithRetry('/summary/x', {} as any, 2)).rejects.toThrow(/Failed after 2 attempts: boom/);
  });

  test('honors WIKI_HELPERS_RETRY_BASE_MS env var parsing branch', async () => {
    process.env.WIKI_HELPERS_RETRY_BASE_MS = '5';
    // make a simple success response to exercise the env path
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ title: 'Tx', extract: 'Ex' }) });
    const { fetchWithRetry } = await import('../wiki_helpers');
    const res = await fetchWithRetry('/summary/x', {} as any, 1);
    expect(res.title).toBe('Tx');
  });
});
/**
 * @jest-environment node
 */

// Set up fetch mock BEFORE importing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import { getWikiPage } from '../wiki_helpers';

// Helper to create mock response
const createMockResponse = (data: any, status: number = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 429 ? 'Too Many Requests' : 'Error',
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  };
};

describe('Wiki Helpers', () => {
  const mockWikiSummary = {
    title: 'Albert Einstein',
    extract: 'German-born theoretical physicist',
    pageid: 12345,
  };

  beforeAll(() => {
    console.log('🔍 Verifying fetch mock setup...');
    expect(jest.isMockFunction(global.fetch)).toBe(true);
    console.log('✅ Fetch is properly mocked');
  });

  beforeEach(() => {
    mockFetch.mockClear();
    // Use real timers in tests to avoid fake-timer interactions with retries.
    jest.useRealTimers();
    // Ensure fetch is always mocked
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to advance timers
  const advanceTimers = async (ms: number) => {
    // No-op when using real timers; allow microtasks to flush
    await new Promise((res) => setImmediate(res));
  };

  // Test 1: Basic success
  it('successfully fetches wiki page summary', async () => {
    mockFetch.mockResolvedValue(createMockResponse(mockWikiSummary));

    const result = await getWikiPage('Albert Einstein');

    expect(result.title).toBe('Albert Einstein');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // Test 2: Full content fetch
  it('fetches full content when getFullContent is true', async () => {
    const mockFullContent = '<html><body>Full content</body></html>';
    
    mockFetch
      .mockResolvedValueOnce(createMockResponse(mockWikiSummary))
      .mockResolvedValueOnce(createMockResponse(mockFullContent));

    const result = await getWikiPage('Albert Einstein', true);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.fullContent).toBe(mockFullContent);
  });

  // Test 3: Full content fetch failure
  it('handles full content fetch failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockFetch
      .mockResolvedValueOnce(createMockResponse(mockWikiSummary))
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await getWikiPage('Albert Einstein', true);

    expect(result.fullContent).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Test 4: HTTP 404 - should fail after retries
  it('handles HTTP 404 error response', async () => {
    // Override the mock for this test to always return 404
    mockFetch.mockImplementation(() => Promise.resolve(createMockResponse({}, 404)));
    await expect(getWikiPage('NonExistentPage')).rejects.toThrow(/Failed after 3 attempts/);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 15000);

  // Test 5: Network errors with successful retry
  it('handles network errors with retry and eventually succeeds', async () => {
    const networkError = new Error('Network failure');
    let callCount = 0;
    
    // Custom implementation to fail twice then succeed
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(networkError);
      }
      return Promise.resolve(createMockResponse(mockWikiSummary));
    });

    const promise = getWikiPage('Albert Einstein');
    
    await advanceTimers(1000);
    await advanceTimers(2000);
    
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.title).toBe('Albert Einstein');
  }, 15000);

  // Test 6: Max retries exceeded
  it('fails after max retries exceeded', async () => {
    const error = new Error('Persistent failure');
    
    // Always reject
    mockFetch.mockRejectedValue(error);
    await expect(getWikiPage('Albert Einstein')).rejects.toThrow(/Failed after 3 attempts/);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 15000);

  // Test 7: Rate limiting with retry-after header
  it('handles rate limiting (429) with retry-after header', async () => {
    const retryHeaders = new Headers();
    retryHeaders.set('retry-after', '1');
    
    const rateLimitResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: retryHeaders,
      json: jest.fn().mockResolvedValue({}),
    };
    
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(rateLimitResponse);
      }
      return Promise.resolve(createMockResponse(mockWikiSummary));
    });

    const promise = getWikiPage('Albert Einstein');
    
    await advanceTimers(1000);
    
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.title).toBe('Albert Einstein');
  }, 15000);

  // Test 8: Rate limiting without retry-after header
  it('handles rate limiting (429) without retry-after header', async () => {
    const rateLimitResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({}),
    };
    
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(rateLimitResponse);
      }
      return Promise.resolve(createMockResponse(mockWikiSummary));
    });

    const promise = getWikiPage('Albert Einstein');
    
    await advanceTimers(1000);
    
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.title).toBe('Albert Einstein');
  }, 15000);

  // Test 9: URL encoding
  it('encodes special characters in URL', async () => {
    mockFetch.mockResolvedValue(createMockResponse(mockWikiSummary));

    await getWikiPage('Albert Einstein (scientist)');

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('Albert%20Einstein%20(scientist)');
  });

  // Test 10: Empty title
  it('handles empty title', async () => {
    await expect(getWikiPage('')).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Test 11: Missing extract field
  it('handles response with missing extract field', async () => {
    const responseWithoutExtract = {
      title: 'Test Page',
      pageid: 12345,
    };
    
    mockFetch.mockResolvedValue(createMockResponse(responseWithoutExtract));

    const result = await getWikiPage('Test');

    expect(result.summary).toBeUndefined();
    expect(result.text).toBeUndefined();
    expect(result.title).toBe('Test Page');
  });

  // Test 12: Missing title field
  it('handles response with missing title field', async () => {
    const responseWithoutTitle = {
      extract: 'Content here',
      pageid: 12345,
    };
    
    mockFetch.mockResolvedValue(createMockResponse(responseWithoutTitle));

    const result = await getWikiPage('TestPage');

    expect(result.title).toBeUndefined();
    expect(result.summary).toBe('Content here');
  });

  // Test 13: Headers are sent correctly
  it('sends correct headers with request', async () => {
    mockFetch.mockResolvedValue(createMockResponse(mockWikiSummary));

    await getWikiPage('Albert Einstein');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers;
    
    expect(headers['User-Agent']).toContain('TriviaApp');
    expect(headers['Accept']).toBe('application/json');
  });

  // Test 14: Verify no real network calls
  it('verifies all fetch calls were mocked', async () => {
    // Make a test call
    mockFetch.mockResolvedValue(createMockResponse(mockWikiSummary));
    await getWikiPage('VerificationTest');
    
    // Verify fetch was called but it's our mock
    expect(mockFetch).toHaveBeenCalled();
    expect(jest.isMockFunction(global.fetch)).toBe(true);
    
    console.log('✅ VERIFIED: All fetch calls were intercepted by mock');
  });
});

// Final verification
afterAll(() => {
  console.log('\n📊 FINAL VERIFICATION:');
  console.log(`   Total mock calls: ${mockFetch.mock.calls.length}`);
  console.log('   ✅ No real network calls were made to Wikipedia API');
});