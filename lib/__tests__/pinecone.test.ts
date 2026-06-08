// lib/__tests__/pinecone-simple.test.ts
import { describe, expect, it, jest } from '@jest/globals';

// Mock config
jest.mock('@/config/env', () => ({
  PINECONE_API_KEY: 'test-key',
  PINECONE_INDEX_DEV: 'test-index',
}));

// Create a real mock implementation with explicit types so TypeScript
// does not infer `never` for the mock return types.
const mockUpsert = jest.fn<Promise<void>, [any]>().mockResolvedValue(undefined);
const mockQuery = jest.fn<Promise<{ matches: any[] }>, [any]>().mockResolvedValue({ matches: [] });
const mockDeleteMany = jest.fn<Promise<void>, [any]>().mockResolvedValue(undefined);
const mockFetch = jest.fn<Promise<{ records: Record<string, any> }>, [any]>().mockResolvedValue({ records: {} });
const mockDescribeStats = jest.fn<Promise<{ totalRecordCount: number }>, []>().mockResolvedValue({ totalRecordCount: 0 });

const mockIndexInstance = {
  upsert: mockUpsert,
  query: mockQuery,
  deleteMany: mockDeleteMany,
  fetch: mockFetch,
  describeIndexStats: mockDescribeStats,
};

// Mock the entire module at the file level
jest.mock('@pinecone-database/pinecone', () => {
  return {
    Pinecone: class {
      constructor(apiKey: any) {
        // Constructor implementation
      }
      index() {
        return mockIndexInstance;
      }
    },
    Index: jest.fn(),
  };
});

// Import the module
import { getPineconeIndex } from '../pinecone';

describe('Pinecone Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an index', () => {
    const index = getPineconeIndex();
    expect(index).toBeDefined();
  });

  it('should return the same index on multiple calls', () => {
    const index1 = getPineconeIndex();
    const index2 = getPineconeIndex();
    expect(index1).toBe(index2);
  });

  it('should allow upsert', async () => {
    const index = getPineconeIndex();
    const vectors = { records: [{ id: '1', values: [0.1, 0.2] }] };
    await index.upsert(vectors);
    expect(mockUpsert).toHaveBeenCalledWith(vectors);
  });

  it('should allow query', async () => {
    const index = getPineconeIndex();
    const queryOptions = { vector: [0.1, 0.2], topK: 5 };
    await index.query(queryOptions);
    expect(mockQuery).toHaveBeenCalledWith(queryOptions);
  });
});