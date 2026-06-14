import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import type OpenAI from 'openai';
import OpenAIClientManager from '../OpenAIClientManager';

// Define the response types
type EmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
  usage?: { prompt_tokens: number; total_tokens: number };
};

type ChatCompletionResponse = {
  choices: Array<{ message: { content: string | null } }>;
};

// Mock environment variables
jest.mock('@/config/env', () => ({
  EMBEDDING_MODEL: 'text-embedding-3-small',
  CHAT_MODEL: 'gpt-3.5-turbo',
}));

// Create mock functions that will be used across the test
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEmbeddingsCreate = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChatCompletionsCreate = jest.fn() as any;

// Mock OpenAI module - define the mock inline to avoid hoisting issues
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockEmbeddingsCreate,
    },
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
  })),
}));

const originalEnv = process.env;

describe('OpenAIClientManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-api-key' };
    process.env.CHAT_MODEL = 'gpt-3.5-turbo';

    // Reset the client by setting it to null
    OpenAIClientManager.setClient(null);

    // Setup default mock implementations
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'warmed up' } }],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getClient', () => {
    it('should create singleton client', () => {
      const client1 = OpenAIClientManager.getClient();
      const client2 = OpenAIClientManager.getClient();

      expect(client1).toBe(client2);

      // Get the mocked constructor
      const { default: MockedOpenAI } = jest.requireMock('openai') as { default: jest.Mock };
      expect(MockedOpenAI).toHaveBeenCalledTimes(1);
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should reuse existing client', () => {
      const client1 = OpenAIClientManager.getClient();
      const client2 = OpenAIClientManager.getClient();

      expect(client1).toBe(client2);

      const { default: MockedOpenAI } = jest.requireMock('openai') as { default: jest.Mock };
      expect(MockedOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEmbedding', () => {
    it('should get embedding for question', async () => {
      const mockEmbedding = [0.5, 0.6, 0.7];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await OpenAIClientManager.getEmbedding('test question');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test question',
      });
    });

    it('should handle errors', async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error('API Error'));

      await expect(OpenAIClientManager.getEmbedding('test')).rejects.toThrow('API Error');
    });
  });

  describe('embed', () => {
    it('should embed text', async () => {
      const mockEmbedding = [0.5, 0.6, 0.7];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await OpenAIClientManager.embed('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text',
      });
    });

    it('should handle errors in embed', async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error('Embedding failed'));

      await expect(OpenAIClientManager.embed('test')).rejects.toThrow('Embedding failed');
    });
  });

  describe('warmupChatCompletion', () => {
    it('should send warmup request', async () => {
      await OpenAIClientManager.warmupChatCompletion();

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'warmup' }],
      });
    });

    it('should handle errors in warmup', async () => {
      mockChatCompletionsCreate.mockRejectedValueOnce(new Error('Warmup failed'));

      await expect(OpenAIClientManager.warmupChatCompletion()).rejects.toThrow('Warmup failed');
    });
  });

  describe('setClient', () => {
    it('should allow setting custom client for testing', () => {
      const mockCustomClient = {
        embeddings: { create: jest.fn() },
        chat: { completions: { create: jest.fn() } },
      } as unknown as OpenAI;

      OpenAIClientManager.setClient(mockCustomClient);
      expect(OpenAIClientManager.getClient()).toBe(mockCustomClient);
    });
  });
});