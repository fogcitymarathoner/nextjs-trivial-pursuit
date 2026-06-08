// @ts-nocheck
import { getOpenAIClient, getOpenAIEmbedding, warmupChatCompletion } from "../openai";

// Mock environment variables BEFORE importing any modules that use them
jest.mock("@/config/env", () => ({
  EMBEDDING_MODEL: "text-embedding-3-small",
  CHAT_MODEL: "gpt-3.5-turbo",
}));

// Create mock functions
const mockEmbeddingsCreate = jest.fn();
const mockChatCompletionsCreate = jest.fn();

// Mock OpenAI module
jest.mock("openai", () => {
  return {
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
  };
});

// Import OpenAI after mock
import OpenAI from "openai";

// Set environment variables directly for the test
process.env.CHAT_MODEL = "gpt-3.5-turbo";
process.env.OPENAI_API_KEY = "test-api-key";

const originalEnv = process.env;

describe("OpenAI Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };

    // Ensure CHAT_MODEL is set
    process.env.CHAT_MODEL = "gpt-3.5-turbo";

    // Setup default mock implementations
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "warmed up" } }],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getOpenAIClient", () => {
    it("should create singleton client", () => {
      const client1 = getOpenAIClient();
      const client2 = getOpenAIClient();

      expect(client1).toBe(client2);
      expect(OpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOpenAIEmbedding", () => {
    it("should get embedding for question", async () => {
      const mockEmbedding = [0.5, 0.6, 0.7];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await getOpenAIEmbedding("test question");

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "test question",
      });
    });

    it("should handle errors", async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error("API Error"));

      await expect(getOpenAIEmbedding("test")).rejects.toThrow("API Error");
    });
  });

  describe("warmupChatCompletion", () => {
    it("should send warmup request", async () => {
      await warmupChatCompletion();

      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "warmup" }],
      });
    });

    it("should handle errors in warmup", async () => {
      const error = new Error("Warmup failed");
      mockChatCompletionsCreate.mockRejectedValueOnce(error);

      await expect(warmupChatCompletion()).rejects.toThrow("Warmup failed");
    });
  });
});