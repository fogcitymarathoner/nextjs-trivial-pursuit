/**
 * @jest-environment node
 */

// Add this at the very top - before any other imports
import 'cross-fetch/polyfill';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock config
jest.mock('@/config/env', () => ({
  PINECONE_API_KEY: 'test-key',
  PINECONE_INDEX_DEV: 'test-index',
}));

// Create mocks - simplified without type assertions
const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockQuery = jest.fn().mockResolvedValue({ matches: [] });
const mockDeleteMany = jest.fn().mockResolvedValue(undefined);
const mockFetch = jest.fn().mockResolvedValue({ records: {} });
const mockDescribeStats = jest.fn().mockResolvedValue({ totalRecordCount: 0 });

const mockIndexInstance = {
  upsert: mockUpsert,
  query: mockQuery,
  deleteMany: mockDeleteMany,
  fetch: mockFetch,
  describeIndexStats: mockDescribeStats,
};

// Mock Pinecone
jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: class {
    constructor(_apiKey: any) {}
    index() {
      return mockIndexInstance;
    }
  },
  Index: jest.fn(),
}));

// Import after mocks
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