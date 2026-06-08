// lib/__tests__/chunk_helpers.test.ts
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { getOpenAIClient } from "../openai";
import { EMBEDDING_MODEL } from "@/config/env";
import { embed, generateChunkId, processChunkMetadata } from "../chunk_helpers";

// Mock the dependencies
jest.mock("../openai", () => ({
  getOpenAIClient: jest.fn(),
}));

jest.mock("@/config/env", () => ({
  EMBEDDING_MODEL: "text-embedding-ada-002",
}));

// FIX: Declare as any to avoid TypeScript issues
const mockEmbeddingsCreate = jest.fn() as any;
const mockOpenAIClient = {
  embeddings: {
    create: mockEmbeddingsCreate,
  },
};

describe("chunk_helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOpenAIClient as jest.Mock).mockReturnValue(mockOpenAIClient);

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
      const result = await embed(mockText);

      expect(getOpenAIClient).toHaveBeenCalledTimes(1);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: EMBEDDING_MODEL,
        input: mockText,
      });
      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it("should handle empty string input", async () => {
      await embed("");

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: EMBEDDING_MODEL,
        input: "",
      });
    });

    it("should throw error when OpenAI API fails", async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error("OpenAI API error"));

      await expect(embed(mockText)).rejects.toThrow("OpenAI API error");
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
