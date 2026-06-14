import '@testing-library/jest-dom';
import type OpenAI from 'openai';
import {generateChunkId, processChunkMetadata} from "../chunk_helpers";
import OpenAIClientManager from "@/lib/OpenAIClientManager"

// Define response type for OpenAI embeddings
type EmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
  usage: { prompt_tokens: number; total_tokens: number };
};

// Mock the dependencies - properly type the embed mock
jest.mock("@/lib/OpenAIClientManager", () => ({
  __esModule: true,
  default: {
    getClient: jest.fn(),
    embed: jest.fn() as unknown as jest.MockedFunction<() => Promise<number[]>>,
  }
}));

jest.mock("@/config/env.server", () => ({
  EMBEDDING_MODEL: "text-embedding-ada-002",
}));

// Properly typed mock
const mockEmbeddingsCreate = jest.fn() as unknown as jest.MockedFunction<() => Promise<EmbeddingsResponse>>;

// Create a properly typed mock OpenAI client
const mockOpenAIClient = {
  embeddings: {
    create: mockEmbeddingsCreate,
  },
} as const; // Use 'as const' for a readonly but properly typed object

// Create typed references
const mockGetClient = OpenAIClientManager.getClient as jest.MockedFunction<typeof OpenAIClientManager.getClient>;
const mockEmbed = OpenAIClientManager.embed as jest.MockedFunction<typeof OpenAIClientManager.embed>;

// Type assertion helper (no 'any' needed)
const assertAsOpenAIClient = (client: unknown): OpenAI => client as OpenAI;

describe("chunk_helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use the typed assertion function instead of 'as any'
    mockGetClient.mockReturnValue(assertAsOpenAIClient(mockOpenAIClient));

    // Default successful response
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      usage: { prompt_tokens: 10, total_tokens: 10 },
    });
  });

  describe("generateChunkId", () => {
    it("should generate a base64 encoded ID from chunk text", () => {
      const chunkText = "This is a sample chunk of text for testing";
      const expectedId = Buffer.from(chunkText.substring(0, 100)).toString("base64");

      const result = generateChunkId(chunkText);

      expect(result).toBe(expectedId);
    });

    it("should handle empty string", () => {
      const result = generateChunkId("");
      const expected = Buffer.from("").toString("base64");
      expect(result).toBe(expected);
    });

    it("should only use first 100 characters", () => {
      const longText = "a".repeat(200);
      const result = generateChunkId(longText);
      const expected = Buffer.from("a".repeat(100)).toString("base64");
      expect(result).toBe(expected);
    });
  });

  describe("embed", () => {
    const mockText = "This is a test text for embedding";

    it("should return embedding array for valid text", async () => {
      const mockEmbeddingResult = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbed.mockResolvedValue(mockEmbeddingResult);

      const result = await OpenAIClientManager.embed(mockText);

      expect(mockEmbed).toHaveBeenCalledWith(mockText);
      expect(result).toEqual(mockEmbeddingResult);
    });

    it("should handle empty string input", async () => {
      mockEmbed.mockResolvedValue([]);

      await OpenAIClientManager.embed("");

      expect(mockEmbed).toHaveBeenCalledWith("");
    });

    it("should throw error when OpenAI API fails", async () => {
      const error = new Error("OpenAI API error");
      mockEmbed.mockRejectedValueOnce(error);

      await expect(OpenAIClientManager.embed(mockText)).rejects.toThrow("OpenAI API error");
      expect(mockEmbed).toHaveBeenCalledWith(mockText);
    });
  });

  describe("processChunkMetadata", () => {
    const mockProps = {
      chunkText: "This is the chunk text content",
      title: "Test Title",
      pageUrl: "https://example.com/page",
      namespace: "test-namespace",
      customerUid: "cust-123",
      scrapeVersion: "v1.0.0",
      chunkIndex: 0,
      links: ["https://example.com/link1", "https://example.com/link2"],
      pageNumbers: [1, 2, 3],
    };

    it("should return correctly formatted ChunkMetadata object", () => {
      const result = processChunkMetadata(
        mockProps.chunkText,
        mockProps.title,
        mockProps.pageUrl,
        mockProps.namespace,
        mockProps.customerUid,
        mockProps.scrapeVersion,
        mockProps.chunkIndex,
        mockProps.links,
        mockProps.pageNumbers
      );

      expect(result).toEqual({
        text: mockProps.chunkText,
        title: mockProps.title,
        pageUrl: mockProps.pageUrl,
        namespace: mockProps.namespace,
        customerUid: mockProps.customerUid,
        scrapeVersion: mockProps.scrapeVersion,
        chunkIndex: mockProps.chunkIndex,
        links: mockProps.links,
        pageNumbers: mockProps.pageNumbers,
      });
    });

    it("should handle null pageNumbers", () => {
      const result = processChunkMetadata(
        mockProps.chunkText,
        mockProps.title,
        mockProps.pageUrl,
        mockProps.namespace,
        mockProps.customerUid,
        mockProps.scrapeVersion,
        mockProps.chunkIndex,
        mockProps.links,
        null
      );

      expect(result.pageNumbers).toBeNull();
    });

    it("should handle empty links array", () => {
      const result = processChunkMetadata(
        mockProps.chunkText,
        mockProps.title,
        mockProps.pageUrl,
        mockProps.namespace,
        mockProps.customerUid,
        mockProps.scrapeVersion,
        mockProps.chunkIndex,
        [],
        mockProps.pageNumbers
      );

      expect(result.links).toEqual([]);
    });

    it("should handle negative chunkIndex", () => {
      const result = processChunkMetadata(
        mockProps.chunkText,
        mockProps.title,
        mockProps.pageUrl,
        mockProps.namespace,
        mockProps.customerUid,
        mockProps.scrapeVersion,
        -1,
        mockProps.links,
        mockProps.pageNumbers
      );

      expect(result.chunkIndex).toBe(-1);
    });
  });
});
