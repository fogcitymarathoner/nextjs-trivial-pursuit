/**
 * @jest-environment node
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { recreateIndex, createIndexIfNotExists } from "../pinecone_helpers";
import { PINECONE_INDEX_DEV, VECTOR_SIZE } from "@/config/env";

jest.mock("@/config/env", () => ({
  PINECONE_INDEX_DEV: "test-index",
  VECTOR_SIZE: "1536",
}));

jest.mock("@pinecone-database/pinecone", () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    listIndexes: jest.fn(),
    deleteIndex: jest.fn(),
    createIndex: jest.fn(),
  })),
}));

describe("Pinecone Helpers", () => {
  let mockPc: jest.Mocked<Pinecone>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockPc = new Pinecone({ apiKey: "test-key" }) as jest.Mocked<Pinecone>;
  });

  describe("createIndexIfNotExists", () => {
    it("creates index when it does not exist", async () => {
      (mockPc.listIndexes as jest.Mock).mockResolvedValue({ indexes: [] });
      (mockPc.createIndex as jest.Mock).mockResolvedValue(undefined);
      
      // Mock setTimeout to execute immediately
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });
      
      await createIndexIfNotExists(mockPc, "test-index");
      
      setTimeoutSpy.mockRestore();
      expect(mockPc.createIndex).toHaveBeenCalled();
    }, 15000);

    it("does not create index when it exists", async () => {
      (mockPc.listIndexes as jest.Mock).mockResolvedValue({
        indexes: [{ name: "test-index" }]
      });
      
      await createIndexIfNotExists(mockPc, "test-index");
      
      expect(mockPc.createIndex).not.toHaveBeenCalled();
    });

    it("handles errors", async () => {
      (mockPc.listIndexes as jest.Mock).mockRejectedValue(new Error("API Error"));
      
      await expect(createIndexIfNotExists(mockPc, "test-index")).rejects.toThrow("API Error");
    });
  });

  describe("recreateIndex", () => {
    it("deletes and recreates index when it exists", async () => {
      (mockPc.listIndexes as jest.Mock)
        .mockResolvedValueOnce({ indexes: [{ name: PINECONE_INDEX_DEV }] })
        .mockResolvedValueOnce({ indexes: [] })
        .mockResolvedValueOnce({ indexes: [] });
      
      (mockPc.deleteIndex as jest.Mock).mockResolvedValue(undefined);
      (mockPc.createIndex as jest.Mock).mockResolvedValue(undefined);
      
      // Mock setTimeout to execute immediately
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });
      
      await recreateIndex(mockPc, PINECONE_INDEX_DEV);
      
      setTimeoutSpy.mockRestore();
      expect(mockPc.deleteIndex).toHaveBeenCalled();
      expect(mockPc.createIndex).toHaveBeenCalled();
    }, 15000);

    it("creates index when it does not exist", async () => {
      (mockPc.listIndexes as jest.Mock).mockResolvedValue({ indexes: [] });
      (mockPc.createIndex as jest.Mock).mockResolvedValue(undefined);
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as NodeJS.Timeout;
      });
      
      await recreateIndex(mockPc, PINECONE_INDEX_DEV);
      
      setTimeoutSpy.mockRestore();
      expect(mockPc.deleteIndex).not.toHaveBeenCalled();
      expect(mockPc.createIndex).toHaveBeenCalled();
    }, 15000);
  });
});