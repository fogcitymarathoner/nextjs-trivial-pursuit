// lib/__tests__/OpenAIClientManager.test.ts
import '@testing-library/jest-dom';
import OpenAI from 'openai';
import { OpenAIClientManager } from '@/lib/OpenAIClientManager';
import OpenAIClientManagerInstance from '@/lib/OpenAIClientManager';

// Mock environment variables
jest.mock('@/config/env.server', () => ({
  EMBEDDING_MODEL: 'text-embedding-3-small',
  CHAT_MODEL: 'gpt-3.5-turbo',
}));

// Mock OpenAI module
type MockEmbeddingResponse = {
  data: Array<{ embedding: number[] }>;
  usage?: { prompt_tokens: number; total_tokens: number };
};

type MockChatCompletionResponse = {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; total_tokens: number };
};

const mockEmbeddingsCreate = jest.fn() as unknown as jest.MockedFunction<() => Promise<MockEmbeddingResponse>>;
const mockChatCompletionsCreate = jest.fn() as unknown as jest.MockedFunction<() => Promise<MockChatCompletionResponse>>;

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

type OpenAIClientManagerValue = ReturnType<typeof OpenAIClientManager.getInstance>;

const resetSingleton = (instance: OpenAIClientManagerValue | null = null): void => {
  (OpenAIClientManager as unknown as { instance: OpenAIClientManagerValue | null }).instance = instance;
};

describe('OpenAIClientManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-api-key-123' };
    process.env.CHAT_MODEL = 'gpt-3.5-turbo';

    // Reset the singleton instance for each test
    resetSingleton();

    // Reset any stored client
    const newInstance = OpenAIClientManager.getInstance();
    newInstance.setClient(null);

    // Setup default mock implementations
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      usage: { prompt_tokens: 10, total_tokens: 10 },
    });

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'Warmup successful' } }],
      usage: { prompt_tokens: 5, total_tokens: 5 },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = OpenAIClientManager.getInstance();
      const instance2 = OpenAIClientManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance when using default export', () => {
      OpenAIClientManagerInstance.setClient(null);
      resetSingleton(OpenAIClientManagerInstance);
      expect(OpenAIClientManager.getInstance()).toBe(OpenAIClientManagerInstance);
    });
  });

  describe('getClient', () => {
    it('should create a new OpenAI client when none exists', () => {
      const client = OpenAIClientManager.getInstance().getClient();
      expect(client).toBeDefined();
      expect(OpenAI).toHaveBeenCalledTimes(1);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key-123' });
    });

    it('should reuse existing client on subsequent calls', () => {
      const manager = OpenAIClientManager.getInstance();
      const client1 = manager.getClient();
      const client2 = manager.getClient();

      expect(client1).toBe(client2);
      expect(OpenAI).toHaveBeenCalledTimes(1);
    });

    it('should return client after setClient was called', () => {
      const manager = OpenAIClientManager.getInstance();
      const mockClient = { test: 'mock' } as unknown as OpenAI;

      manager.setClient(mockClient);
      const client = manager.getClient();

      expect(client).toBe(mockClient);
      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe('setClient', () => {
    it('should allow setting a custom client', () => {
      const manager = OpenAIClientManager.getInstance();
      const mockClient = { custom: true } as unknown as OpenAI;

      manager.setClient(mockClient);
      expect(manager.getClient()).toBe(mockClient);
    });

    it('should allow setting client to null', () => {
      const manager = OpenAIClientManager.getInstance();
      const originalClient = manager.getClient();

      manager.setClient(null);
      const newClient = manager.getClient();

      expect(newClient).not.toBe(originalClient);
      expect(OpenAI).toHaveBeenCalledTimes(2); // Once for original, once for new
    });
  });

  describe('getEmbedding', () => {
    it('should return embedding for a question', async () => {
      const mockEmbedding = [0.5, 0.6, 0.7, 0.8, 0.9];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 8, total_tokens: 8 },
      });

      const result = await OpenAIClientManager.getInstance().getEmbedding('What is TypeScript?');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'What is TypeScript?',
      });
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('OpenAI API rate limit exceeded');
      mockEmbeddingsCreate.mockRejectedValueOnce(apiError);

      await expect(
        OpenAIClientManager.getInstance().getEmbedding('test question')
      ).rejects.toThrow('OpenAI API rate limit exceeded');
    });

    it('should handle empty string input', async () => {
      const mockEmbedding = [0.0, 0.0, 0.0];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      });

      const result = await OpenAIClientManager.getInstance().getEmbedding('');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: '',
      });
    });

    it('should handle long text input', async () => {
      const longText = 'a'.repeat(10000);
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 2500, total_tokens: 2500 },
      });

      const result = await OpenAIClientManager.getInstance().getEmbedding(longText);

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: longText,
      });
    });
  });

  describe('embed', () => {
    it('should embed text and return vector', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 5, total_tokens: 5 },
      });

      const result = await OpenAIClientManager.getInstance().embed('Sample text to embed');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'Sample text to embed',
      });
    });

    it('should be aliased to getEmbedding functionality', async () => {
      const mockEmbedding = [0.9, 0.8, 0.7];
      mockEmbeddingsCreate
        .mockResolvedValueOnce({
          data: [{ embedding: mockEmbedding }],
        })
        .mockResolvedValueOnce({
          data: [{ embedding: mockEmbedding }],
        });

      const embedResult = await OpenAIClientManager.getInstance().embed('test');
      const getEmbeddingResult = await OpenAIClientManager.getInstance().getEmbedding('test');

      expect(embedResult).toEqual(getEmbeddingResult);
    });

    it('should handle errors during embedding', async () => {
      const error = new Error('Embedding service unavailable');
      mockEmbeddingsCreate.mockRejectedValueOnce(error);

      await expect(
        OpenAIClientManager.getInstance().embed('error test')
      ).rejects.toThrow('Embedding service unavailable');
    });
  });

  describe('warmupChatCompletion', () => {
    it('should send warmup request successfully', async () => {
      const result = await OpenAIClientManager.getInstance().warmupChatCompletion();

      expect(result).toEqual({
        choices: [{ message: { content: 'Warmup successful' } }],
        usage: { prompt_tokens: 5, total_tokens: 5 },
      });
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'warmup' }],
      });
    });

    it('should handle warmup errors', async () => {
      const error = new Error('Chat completion failed');
      mockChatCompletionsCreate.mockRejectedValueOnce(error);

      await expect(
        OpenAIClientManager.getInstance().warmupChatCompletion()
      ).rejects.toThrow('Chat completion failed');
    });

    it('should use correct model from environment', async () => {
      process.env.CHAT_MODEL = 'gpt-4';

      await OpenAIClientManager.getInstance().warmupChatCompletion();

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'warmup' }],
      });
    });
  });

  describe('Singleton behavior across instances', () => {
    it('should maintain state across multiple references', () => {
      OpenAIClientManagerInstance.setClient(null);
      resetSingleton(OpenAIClientManagerInstance);

      const manager1 = OpenAIClientManager.getInstance();
      const manager2 = OpenAIClientManager.getInstance();
      const defaultImport = OpenAIClientManagerInstance;

      const mockClient = { test: 'client' } as unknown as OpenAI;
      manager1.setClient(mockClient);

      expect(manager2.getClient()).toBe(mockClient);
      expect(defaultImport.getClient()).toBe(mockClient);
    });

    it('should reset client when setClient(null) is called', () => {
      const manager = OpenAIClientManager.getInstance();
      const mockClient = { test: 'client' } as unknown as OpenAI;

      manager.setClient(mockClient);
      expect(manager.getClient()).toBe(mockClient);

      manager.setClient(null);
      const newClient = manager.getClient();
      expect(newClient).not.toBe(mockClient);
      expect(OpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment variable handling', () => {
    it('should use API key from environment', () => {
      const manager = OpenAIClientManager.getInstance();
      manager.setClient(null); // Force recreation

      manager.getClient();

      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key-123' });
    });

    it('should handle missing API key gracefully', () => {
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const manager = OpenAIClientManager.getInstance();
      manager.setClient(null);

      // Should still attempt to create client (OpenAI will handle missing key)
      expect(() => manager.getClient()).not.toThrow();

      process.env.OPENAI_API_KEY = originalApiKey;
    });
  });
});
