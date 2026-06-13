/**
 * @jest-environment node
 */

describe('openai_answer_helpers (doMock + require) fixed', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('queryPinecone returns null when no matches', async () => {
    // Create mocks for the new OpenAIClientManager
    const mockGetEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockQuery = jest.fn().mockResolvedValue({ matches: [] });
    const mockChatCompletionCreate = jest.fn();

    // Mock OpenAIClientManager (replaces @/lib/openai)
    jest.doMock('@/lib/OpenAIClientManager', () => ({
      __esModule: true,
      default: {
        getEmbedding: mockGetEmbedding,
        getClient: () => ({
          chat: {
            completions: {
              create: mockChatCompletionCreate,
            },
          },
        }),
        embed: jest.fn(),
        warmupChatCompletion: jest.fn(),
        setClient: jest.fn(),
      },
    }));

    // Mock PineconeManager
    jest.doMock('@/lib/PineconeManager', () => ({
      __esModule: true,
      default: {
        getIndex: () => ({ query: mockQuery }),
      },
    }));

    // Mock config
    jest.doMock('@/config/env', () => ({
      DEBUG: 'false',
      CHAT_MODEL: 'gpt-3.5-turbo',
      DEFAULT_THRESHOLD: '0.4',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    }));

    const { queryPinecone } = await import('../openai_answer_helpers');

    const res = await queryPinecone('Q?', 0.5);
    expect(res).toBeNull();
    expect(mockGetEmbedding).toHaveBeenCalledWith('Q?');
  });

  it('getAnswer returns fallback when no context and fallback disabled', async () => {
    // Create mocks for the new OpenAIClientManager
    const mockGetEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockQuery = jest.fn().mockResolvedValue(null);
    const mockChatCompletionCreate = jest.fn();

    // Mock OpenAIClientManager
    jest.doMock('@/lib/OpenAIClientManager', () => ({
      __esModule: true,
      default: {
        getEmbedding: mockGetEmbedding,
        getClient: () => ({
          chat: {
            completions: {
              create: mockChatCompletionCreate,
            },
          },
        }),
        embed: jest.fn(),
        warmupChatCompletion: jest.fn(),
        setClient: jest.fn(),
      },
    }));

    // Mock PineconeManager
    jest.doMock('@/lib/PineconeManager', () => ({
      __esModule: true,
      default: {
        getIndex: () => ({ query: mockQuery }),
      },
    }));

    // Mock config
    jest.doMock('@/config/env', () => ({
      DEBUG: 'true',
      CHAT_MODEL: 'gpt-3.5-turbo',
      DEFAULT_THRESHOLD: '0.4',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    }));

    const { getAnswer } = await import('../openai_answer_helpers');

    const res = await getAnswer('Q?', 0.5, false);
    expect(res).toContain('I cannot answer this question');
    expect(mockChatCompletionCreate).not.toHaveBeenCalled();
  });

  it('getAnswer uses context when matches present and returns LLM answer', async () => {
    // Create mocks for the new OpenAIClientManager
    const mockGetEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockQuery = jest.fn().mockResolvedValue({
      matches: [
        {
          id: '1',
          score: 0.9,
          metadata: { text: 'some context', page: 1, source: 'src' },
        },
      ],
    });
    const mockChatCompletionCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'LLM ANSWER' } }],
    });

    // Mock OpenAIClientManager
    jest.doMock('@/lib/OpenAIClientManager', () => ({
      __esModule: true,
      default: {
        getEmbedding: mockGetEmbedding,
        getClient: () => ({
          chat: {
            completions: {
              create: mockChatCompletionCreate,
            },
          },
        }),
        embed: jest.fn(),
        warmupChatCompletion: jest.fn(),
        setClient: jest.fn(),
      },
    }));

    // Mock PineconeManager
    jest.doMock('@/lib/PineconeManager', () => ({
      __esModule: true,
      default: {
        getIndex: () => ({ query: mockQuery }),
      },
    }));

    // Mock config
    jest.doMock('@/config/env', () => ({
      DEBUG: 'false',
      CHAT_MODEL: 'gpt-3.5-turbo',
      DEFAULT_THRESHOLD: '0.4',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    }));

    const { getAnswer } = await import('../openai_answer_helpers');

    const res = await getAnswer('Q?', 0.5, true);
    expect(res).toBe('LLM ANSWER');
    expect(mockGetEmbedding).toHaveBeenCalledWith('Q?');
    expect(mockChatCompletionCreate).toHaveBeenCalled();
  });

  it('getAnswer falls back to general knowledge when no context found', async () => {
    // Create mocks for the new OpenAIClientManager
    const mockGetEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockQuery = jest.fn().mockResolvedValue(null);
    const mockChatCompletionCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'LLM ANSWER' } }],
    });

    // Mock OpenAIClientManager
    jest.doMock('@/lib/OpenAIClientManager', () => ({
      __esModule: true,
      default: {
        getEmbedding: mockGetEmbedding,
        getClient: () => ({
          chat: {
            completions: {
              create: mockChatCompletionCreate,
            },
          },
        }),
        embed: jest.fn(),
        warmupChatCompletion: jest.fn(),
        setClient: jest.fn(),
      },
    }));

    // Mock PineconeManager
    jest.doMock('@/lib/PineconeManager', () => ({
      __esModule: true,
      default: {
        getIndex: () => ({ query: mockQuery }),
      },
    }));

    // Mock config
    jest.doMock('@/config/env', () => ({
      DEBUG: 'true',
      CHAT_MODEL: 'gpt-3.5-turbo',
      DEFAULT_THRESHOLD: '0.4',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    }));

    const { getAnswer } = await import('../openai_answer_helpers');

    const res = await getAnswer('Q?', 0.5, true);
    expect(res).toBe('LLM ANSWER');
    expect(mockChatCompletionCreate).toHaveBeenCalled();

    const callArgs = mockChatCompletionCreate.mock.calls[0][0];
    expect(callArgs.messages[1].content).toContain("couldn't find any relevant context");
  });

  it('queryPinecone filters by threshold and returns matches', async () => {
    // Create mocks for the new OpenAIClientManager
    const mockGetEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockQuery = jest.fn().mockResolvedValue({
      matches: [
        { id: '1', score: 0.9, metadata: { text: 'A' } },
        { id: '2', score: 0.2, metadata: { text: 'B' } },
      ],
    });
    const mockChatCompletionCreate = jest.fn();

    // Mock OpenAIClientManager
    jest.doMock('@/lib/OpenAIClientManager', () => ({
      __esModule: true,
      default: {
        getEmbedding: mockGetEmbedding,
        getClient: () => ({
          chat: {
            completions: {
              create: mockChatCompletionCreate,
            },
          },
        }),
        embed: jest.fn(),
        warmupChatCompletion: jest.fn(),
        setClient: jest.fn(),
      },
    }));

    // Mock PineconeManager
    jest.doMock('@/lib/PineconeManager', () => ({
      __esModule: true,
      default: {
        getIndex: () => ({ query: mockQuery }),
      },
    }));

    // Mock config
    jest.doMock('@/config/env', () => ({
      DEBUG: 'false',
      CHAT_MODEL: 'gpt-3.5-turbo',
      DEFAULT_THRESHOLD: '0.4',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    }));

    const { queryPinecone } = await import('../openai_answer_helpers');

    const res = await queryPinecone('Q?', 0.5);
    expect(res).not.toBeNull();
    expect(res!.matches!.length).toBe(1);
    expect(res!.matches![0].id).toBe('1');
  });
});
