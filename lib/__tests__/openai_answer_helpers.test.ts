// lib/__tests__/openai_answer_helpers.test.ts

// IMPORTANT: All mocks MUST be defined before ANY imports
const mockPineconeIndex = {
  query: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  describeIndexStats: jest.fn(),
  fetch: jest.fn(),
  listPaginated: jest.fn(),
  namespace: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('@/lib/PineconeManager', () => ({
  __esModule: true,
  default: {
    getIndex: jest.fn().mockReturnValue(mockPineconeIndex),
  },
}));

jest.mock('@/lib/OpenAIClientManager', () => ({
  __esModule: true,
  default: {
    getEmbedding: jest.fn(),
    getClient: jest.fn(),
    embed: jest.fn(),
    warmupChatCompletion: jest.fn(),
    setClient: jest.fn(),
  },
}));

jest.mock('@/config/env', () => ({
  DEBUG: 'false',
  CHAT_MODEL: 'gpt-3.5-turbo',
  DEFAULT_THRESHOLD: '0.4',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  PINECONE_API_KEY: 'test-api-key',
  PINECONE_INDEX: 'test-index',
  PINECONE_INDEX_DEV: 'test-index',
  VECTOR_SIZE: '1536',
}));

// Now import everything after mocks
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import OpenAIClientManager from '../OpenAIClientManager';
import PineconeManager from '../PineconeManager';
import {
  parseAnswer,
  extractTextFromAnswer,
  isValidAnswer,
  formatAnswerForDisplay,
  extractMetadata,
  mergeAnswers,
  queryPinecone,
  getAnswer
} from '../openai_answer_helpers';

// Get mock references (cast to Jest mock types to satisfy TypeScript)
// Helper types to avoid `any` in tests
type ChatCreateArgs = { messages: Array<{ role?: string; content: string }>; [key: string]: unknown };
type ChatCreateReturn = { choices: Array<{ message: { content: string } }> };
type ChatCreateFn = (args: ChatCreateArgs) => Promise<ChatCreateReturn>;

type PineconeMatch = { id: string; score?: number; metadata?: Record<string, unknown> };
type QueryResult = { matches?: PineconeMatch[] } | null;

const mockGetEmbedding = OpenAIClientManager.getEmbedding as unknown as jest.MockedFunction<(q: string) => Promise<number[]>>;
const mockGetClient = OpenAIClientManager.getClient as unknown as jest.MockedFunction<() => { chat: { completions: { create: jest.MockedFunction<ChatCreateFn> } } }>;
const mockGetIndex = PineconeManager.getIndex as unknown as jest.MockedFunction<() => typeof mockPineconeIndex>;
const mockQuery = mockPineconeIndex.query as jest.MockedFunction<(...args: unknown[]) => Promise<QueryResult>>;

describe('openai_answer_helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIndex.mockReturnValue(mockPineconeIndex);
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    const createMock = jest.fn() as unknown as jest.MockedFunction<ChatCreateFn>;
    createMock.mockResolvedValue({ choices: [{ message: { content: 'test' } }] });
    mockGetClient.mockReturnValue({
      chat: { completions: { create: createMock } }
    });
    mockQuery.mockResolvedValue({ matches: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseAnswer', () => {
    it('should parse valid JSON', () => {
      expect(parseAnswer('{"test": "value"}')).toEqual({ test: 'value' });
    });
    it('should return null for invalid JSON', () => {
      expect(parseAnswer('invalid')).toBeNull();
    });
    it('should return null for null/undefined', () => {
      expect(parseAnswer(null)).toBeNull();
      expect(parseAnswer(undefined)).toBeNull();
    });
  });

  describe('extractTextFromAnswer', () => {
    it('should extract text from string', () => {
      expect(extractTextFromAnswer('hello')).toBe('hello');
    });
    it('should extract text from object', () => {
      expect(extractTextFromAnswer({ text: 'hello' })).toBe('hello');
    });
    it('should extract from nested content', () => {
      expect(extractTextFromAnswer({ content: { text: 'hello' } })).toBe('hello');
    });
    it('should return empty for invalid', () => {
      expect(extractTextFromAnswer(null)).toBe('');
      expect(extractTextFromAnswer(123 as unknown as string)).toBe('');
    });
  });

  describe('isValidAnswer', () => {
    it('should return true for valid text', () => {
      expect(isValidAnswer('hello')).toBe(true);
    });
    it('should return true for object with text', () => {
      expect(isValidAnswer({ text: 'hello' })).toBe(true);
    });
    it('should return false for empty', () => {
      expect(isValidAnswer('')).toBe(false);
      expect(isValidAnswer('   ')).toBe(false);
    });
    it('should return false for null', () => {
      expect(isValidAnswer(null)).toBe(false);
    });
  });

  describe('formatAnswerForDisplay', () => {
    it('should format text', () => {
      expect(formatAnswerForDisplay('  hello  world  ')).toBe('hello world');
    });
    it('should escape HTML', () => {
      expect(formatAnswerForDisplay('<script>')).toBe('&lt;script&gt;');
    });
    it('should return empty for null', () => {
      expect(formatAnswerForDisplay(null)).toBe('');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from object', () => {
      const result = extractMetadata({ confidence: 0.9, model: 'gpt' });
      expect(result).toHaveProperty('confidence', 0.9);
      expect(result).toHaveProperty('model', 'gpt');
    });
    it('should extract specific fields', () => {
      const result = extractMetadata({ confidence: 0.9, model: 'gpt', tokens: 100 }, ['confidence']);
      expect(result).toEqual({ confidence: 0.9 });
    });
    it('should return empty for null', () => {
      expect(extractMetadata(null)).toEqual({});
    });
  });

  describe('mergeAnswers', () => {
    it('should merge string answers', () => {
      const result = mergeAnswers(['a', 'b']);
      expect(result?.text).toBe('a b');
    });
    it('should merge with separator', () => {
      const result = mergeAnswers(['a', 'b'], { separator: ' | ' });
      expect(result?.text).toBe('a | b');
    });
    it('should deduplicate answers', () => {
      const result = mergeAnswers(['a', 'a', 'b'], { deduplicate: true });
      expect(result?.text).toBe('a b');
    });
    it('should return single object as-is', () => {
      const result = mergeAnswers([{ text: 'single', confidence: 0.9 }]);
      expect(result?.text).toBe('single');
      expect(result?.metadata).toEqual({ confidence: 0.9 });
    });
    it('should return null for empty array', () => {
      expect(mergeAnswers([])).toBeNull();
    });
    it('should return null for no valid answers', () => {
      expect(mergeAnswers([null, undefined])).toBeNull();
    });
  });

  describe('queryPinecone', () => {
    it('should return null when no matches', async () => {
      mockQuery.mockResolvedValue({ matches: [] });
      const result = await queryPinecone('test', 0.5);
      expect(result).toBeNull();
    });

    it('should filter matches by threshold', async () => {
      mockQuery.mockResolvedValue({
        matches: [
          { id: '1', score: 0.9, metadata: { text: 'good' } },
          { id: '2', score: 0.3, metadata: { text: 'bad' } }
        ]
      });
      const result = await queryPinecone('test', 0.5);
      expect(result?.matches).toHaveLength(1);
      expect(result?.matches[0].id).toBe('1');
    });
  });

  describe('getAnswer', () => {
    it('should return fallback when no context and fallback disabled', async () => {
      mockQuery.mockResolvedValue(null);
      const result = await getAnswer('test', 0.5, false);
      expect(result).toContain('I cannot answer this question');
    });
  });

  // ============ ADDITIONAL COVERAGE TESTS (INSIDE THE MAIN DESCRIBE) ============
  describe('Additional coverage for uncovered lines', () => {
    describe('parseAnswer - catch block (lines 46-48)', () => {
      it('should trigger catch block and log error when JSON parsing fails', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const invalidJson = '{"invalid": json}';

        const result = parseAnswer(invalidJson);

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse answer:', expect.any(Error));
        consoleErrorSpy.mockRestore();
      });
    });

    describe('extractMetadata - fields filtering loop (lines 127-129)', () => {
      it('should filter and return only specified fields when fields array is provided', () => {
        const answer = {
          text: 'Answer',
          confidence: 0.95,
          model: 'gpt-4',
          tokens: 150,
          temperature: 0.7,
          max_tokens: 500
        };

        const result = extractMetadata(answer, ['confidence', 'temperature']);

        expect(result).toEqual({
          confidence: 0.95,
          temperature: 0.7
        });
      });

      it('should handle fields array with empty result', () => {
        const answer = { text: 'Answer', confidence: 0.95 };
        const result = extractMetadata(answer, ['nonexistent']);

        expect(result).toEqual({});
      });
    });

    describe('extractMetadata - default branch (lines 158-160)', () => {
      it('should include all valid keys when no fields specified', () => {
        const answer = {
          confidence: 0.95,
          model: 'gpt-4',
          tokens: 150,
          temperature: 0.7,
          max_tokens: 500
        };

        const result = extractMetadata(answer);

        expect(result).toHaveProperty('confidence', 0.95);
        expect(result).toHaveProperty('model', 'gpt-4');
        expect(result).toHaveProperty('tokens', 150);
        expect(result).toHaveProperty('temperature', 0.7);
        expect(result).toHaveProperty('max_tokens', 500);
      });

      it('should include metadata from answer.metadata object', () => {
        const answer = {
          confidence: 0.95,
          metadata: { source: 'test', version: '1.0' }
        };

        const result = extractMetadata(answer);

        expect(result).toHaveProperty('confidence', 0.95);
        expect(result).toHaveProperty('source', 'test');
        expect(result).toHaveProperty('version', '1.0');
      });

      it('should skip undefined values', () => {
        const answer = {
          confidence: 0.95,
          model: undefined as unknown as string | undefined,
          tokens: undefined as unknown as number | undefined
        };

        const result = extractMetadata(answer);

        expect(result).toHaveProperty('confidence', 0.95);
        expect(result).not.toHaveProperty('model');
        expect(result).not.toHaveProperty('tokens');
      });
    });

    describe('queryPinecone - else branch (lines 216-218)', () => {
      it('should execute else branch when result.matches exists but is empty', async () => {
        mockQuery.mockResolvedValue({ matches: [] });

        const result = await queryPinecone('test question', 0.5);

        expect(result).toBeNull();
        expect(mockGetEmbedding).toHaveBeenCalledWith('test question');
      });

      it('should execute else branch when result is null', async () => {
        mockQuery.mockResolvedValue(null);

        const result = await queryPinecone('test question', 0.5);

        expect(result).toBeNull();
      });

      it('should execute else branch when result.matches is undefined', async () => {
        mockQuery.mockResolvedValue({ matches: undefined });

        const result = await queryPinecone('test question', 0.5);

        expect(result).toBeNull();
      });
    });

    describe('getAnswer - additional branches', () => {
      it('should handle context building when matches have text', async () => {
        const mockChatCreate = jest.fn() as unknown as jest.MockedFunction<ChatCreateFn>;
        mockChatCreate.mockResolvedValue({
          choices: [{ message: { content: 'Generated answer' } }]
        });
        mockGetClient.mockReturnValue({
          chat: { completions: { create: mockChatCreate } }
        });

        const matches = [
          {
            id: '1',
            score: 0.9,
            metadata: { text: 'First context', source: 'Source1', page: 1 }
          },
          {
            id: '2',
            score: 0.8,
            metadata: { text: 'Second context', source: 'Source2' }
          }
        ];
        mockQuery.mockResolvedValue({ matches });

        await getAnswer('test question', 0.5, true);

        expect(mockChatCreate).toHaveBeenCalled();
        const callArgs = mockChatCreate.mock.calls[0][0] as unknown as ChatCreateArgs;
        expect(callArgs.messages[1].content).toContain('First context');
        expect(callArgs.messages[1].content).toContain('Second context');
        expect(callArgs.messages[1].content).toContain('Source: Source1, Page: 1');
        expect(callArgs.messages[1].content).toContain('Source: Source2');
      });

      it('should handle DEBUG mode when DEBUG === "true"', async () => {
        const originalDebug = process.env.DEBUG;
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const matches = [
          {
            id: '1',
            score: 0.9,
            metadata: { text: 'Debug context', source: 'Debug Source', page: 1 }
          }
        ];
        mockQuery.mockResolvedValue({ matches });
        const mockChatCreate = jest.fn() as unknown as jest.MockedFunction<ChatCreateFn>;
        mockChatCreate.mockResolvedValue({
          choices: [{ message: { content: 'Generated' } }]
        });
        mockGetClient.mockReturnValue({
          chat: { completions: { create: mockChatCreate } }
        });

        await getAnswer('test question', 0.5, true);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('=== Debug Info ==='));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Question: test question'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Context found: true'));

        consoleSpy.mockRestore();
        process.env.DEBUG = originalDebug;
      });

      it('should handle DEBUG mode with no context', async () => {
        const originalDebug = process.env.DEBUG;
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        mockQuery.mockResolvedValue(null);
        const mockChatCreate = jest.fn() as unknown as jest.MockedFunction<ChatCreateFn>;
        mockChatCreate.mockResolvedValue({
          choices: [{ message: { content: 'Fallback answer' } }]
        });
        mockGetClient.mockReturnValue({
          chat: { completions: { create: mockChatCreate } }
        });

        await getAnswer('test question', 0.5, true);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Context found: false'));

        consoleSpy.mockRestore();
        process.env.DEBUG = originalDebug;
      });
    });
  });
});
