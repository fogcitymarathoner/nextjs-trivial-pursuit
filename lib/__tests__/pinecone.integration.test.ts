/**
 * @jest-environment node
 */

// Add this at the very top - before any other imports
import 'cross-fetch/polyfill';
import '@testing-library/jest-dom';

// Mock config
jest.mock('@/config/env.server', () => ({
  PINECONE_API_KEY: 'test-key',
  PINECONE_INDEX_DEV: 'test-index',
}));

// Create typed mocks to satisfy TypeScript
const mockUpsert = jest.fn() as unknown as jest.MockedFunction<(vectors: any) => Promise<void>>;
mockUpsert.mockResolvedValue(undefined as unknown as void);
const mockQuery = jest.fn() as unknown as jest.MockedFunction<(opts: any) => Promise<{ matches: any[] }>>;
mockQuery.mockResolvedValue({ matches: [] });
const mockDeleteMany = jest.fn() as unknown as jest.MockedFunction<(opts: any) => Promise<void>>;
mockDeleteMany.mockResolvedValue(undefined as unknown as void);
const mockFetch = jest.fn() as unknown as jest.MockedFunction<(opts: any) => Promise<{ records: any }>>;
mockFetch.mockResolvedValue({ records: {} });
const mockDescribeStats = jest.fn() as unknown as jest.MockedFunction<() => Promise<{ totalRecordCount: number }>>;
mockDescribeStats.mockResolvedValue({ totalRecordCount: 0 });

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
import PineconeManager from '../PineconeManager';

describe('PineconeManager index access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PineconeManager.setIndex(null);
  });

  it('should return an index', () => {
    const index = PineconeManager.getIndex();
    expect(index).toBeDefined();
  });

  it('should return the same index on multiple calls', () => {
    const index1 = PineconeManager.getIndex();
    const index2 = PineconeManager.getIndex();
    expect(index1).toBe(index2);
  });

  it('should allow upsert', async () => {
    const index = PineconeManager.getIndex();
    const vectors = { records: [{ id: '1', values: [0.1, 0.2] }] };
    await index.upsert(vectors);
    expect(mockUpsert).toHaveBeenCalledWith(vectors);
  });

  it('should allow query', async () => {
    const index = PineconeManager.getIndex();
    const queryOptions = { vector: [0.1, 0.2], topK: 5 };
    await index.query(queryOptions);
    expect(mockQuery).toHaveBeenCalledWith(queryOptions);
  });
});
