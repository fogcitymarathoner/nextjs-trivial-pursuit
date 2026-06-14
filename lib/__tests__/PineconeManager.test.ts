// lib/__tests__/PineconeManager.test.ts
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { Pinecone, Index } from "@pinecone-database/pinecone";
import { PineconeManager } from '../PineconeManager';
import PineconeManagerInstance from '../PineconeManager';

// Mock environment variables
jest.mock('@/config/env', () => ({
  PINECONE_API_KEY: 'test-pinecone-api-key',
  PINECONE_INDEX_DEV: 'test-index-dev',
  VECTOR_SIZE: '1536',
}));

// Mock Pinecone module
type MockListIndexesResponse = {
  indexes?: Array<{ name: string }>;
};

type MockQueryResponse = {
  matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
};

type MockIndexStatsResponse = {
  dimension: number;
  indexFullness: number;
  totalRecordCount: number;
};

type MockFetchResponse = {
  vectors: Record<string, { id: string; values: number[] }>;
};

type MockListPaginatedResponse = {
  vectors: Array<{ id: string }>;
  pagination?: { next: string };
};

const mockCreateIndex = jest.fn<() => Promise<unknown>>();
const mockDeleteIndex = jest.fn<() => Promise<unknown>>();
const mockListIndexes = jest.fn<() => Promise<MockListIndexesResponse>>();
const mockIndexQuery = jest.fn<() => Promise<MockQueryResponse>>();
const mockIndexUpsert = jest.fn<() => Promise<unknown>>();
const mockIndexDeleteOne = jest.fn<() => Promise<unknown>>();
const mockIndexDeleteMany = jest.fn<() => Promise<unknown>>();
const mockIndexDeleteAll = jest.fn<() => Promise<unknown>>();
const mockIndexDescribeStats = jest.fn<() => Promise<MockIndexStatsResponse>>();
const mockIndexFetch = jest.fn<() => Promise<MockFetchResponse>>();
const mockIndexListPaginated = jest.fn<() => Promise<MockListPaginatedResponse>>();

const mockIndexInstance = {
  query: mockIndexQuery,
  upsert: mockIndexUpsert,
  deleteOne: mockIndexDeleteOne,
  deleteMany: mockIndexDeleteMany,
  deleteAll: mockIndexDeleteAll,
  describeIndexStats: mockIndexDescribeStats,
  fetch: mockIndexFetch,
  listPaginated: mockIndexListPaginated,
};

jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    createIndex: mockCreateIndex,
    deleteIndex: mockDeleteIndex,
    listIndexes: mockListIndexes,
    index: jest.fn().mockReturnValue(mockIndexInstance),
  })),
  Index: jest.fn(),
}));

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

const resetSingleton = (instance: PineconeManager | null = null): void => {
  (PineconeManager as unknown as { instance: PineconeManager | null }).instance = instance;
};

describe('PineconeManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();

    // Reset the singleton instance
    resetSingleton();

    // Setup default mock implementations
    mockListIndexes.mockResolvedValue({
      indexes: [{ name: 'test-index-dev' }]
    });
    mockIndexQuery.mockResolvedValue({
      matches: [{ id: '1', score: 0.9, metadata: { text: 'test' } }]
    });
    mockIndexUpsert.mockResolvedValue({ upsertedCount: 1 });
    mockIndexDeleteOne.mockResolvedValue({});
    mockIndexDeleteMany.mockResolvedValue({});
    mockIndexDeleteAll.mockResolvedValue({});
    mockIndexDescribeStats.mockResolvedValue({
      dimension: 1536,
      indexFullness: 0.1,
      totalRecordCount: 100
    });
    mockIndexFetch.mockResolvedValue({
      vectors: { '1': { id: '1', values: [0.1, 0.2] } }
    });
    mockIndexListPaginated.mockResolvedValue({
      vectors: [{ id: '1' }, { id: '2' }],
      pagination: { next: 'token' }
    });
    mockCreateIndex.mockResolvedValue({});
    mockDeleteIndex.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = PineconeManager.getInstance();
      const instance2 = PineconeManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance when using default export', () => {
      resetSingleton(PineconeManagerInstance);
      expect(PineconeManager.getInstance()).toBe(PineconeManagerInstance);
    });
  });

  describe('getClient', () => {
    it('should create a new Pinecone client when none exists', () => {
      const client = PineconeManager.getInstance().getClient();
      expect(client).toBeDefined();
      expect(Pinecone).toHaveBeenCalledTimes(1);
      expect(Pinecone).toHaveBeenCalledWith({ apiKey: 'test-pinecone-api-key' });
    });

    it('should reuse existing client on subsequent calls', () => {
      const manager = PineconeManager.getInstance();
      const client1 = manager.getClient();
      const client2 = manager.getClient();

      expect(client1).toBe(client2);
      expect(Pinecone).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIndex', () => {
    it('should create index when none exists', () => {
      const manager = PineconeManager.getInstance();
      const index = manager.getIndex();

      expect(index).toBeDefined();
      expect(manager.getClient().index).toHaveBeenCalledWith({ name: 'test-index-dev' });
    });

    it('should reuse existing index on subsequent calls', () => {
      const manager = PineconeManager.getInstance();
      const index1 = manager.getIndex();
      const index2 = manager.getIndex();

      expect(index1).toBe(index2);
      expect(manager.getClient().index).toHaveBeenCalledTimes(1);
    });
  });

  describe('query', () => {
    it('should query index with embedding vector', async () => {
      const manager = PineconeManager.getInstance();
      const embedding = [0.1, 0.2, 0.3];

      const result = await manager.query(embedding, 5, true);

      expect(result).toEqual({ matches: [{ id: '1', score: 0.9, metadata: { text: 'test' } }] });
      expect(mockIndexQuery).toHaveBeenCalledWith({
        vector: embedding,
        topK: 5,
        includeValues: false,
        includeMetadata: true,
      });
    });

    it('should use default topK of 3 when not specified', async () => {
      const manager = PineconeManager.getInstance();
      const embedding = [0.1, 0.2, 0.3];

      await manager.query(embedding);

      expect(mockIndexQuery).toHaveBeenCalledWith(expect.objectContaining({ topK: 3 }));
    });

    it('should use default includeMetadata true when not specified', async () => {
      const manager = PineconeManager.getInstance();
      const embedding = [0.1, 0.2, 0.3];

      await manager.query(embedding);

      expect(mockIndexQuery).toHaveBeenCalledWith(expect.objectContaining({ includeMetadata: true }));
    });
  });

  describe('upsert', () => {
    it('should upsert vectors to index', async () => {
      const manager = PineconeManager.getInstance();
      const vectors = [
        { id: 'vec1', values: [0.1, 0.2], metadata: { text: 'test1' } },
        { id: 'vec2', values: [0.3, 0.4], metadata: { text: 'test2' } },
      ];

      await manager.upsert(vectors);

      expect(mockIndexUpsert).toHaveBeenCalledWith({ records: vectors });
    });
  });

  describe('delete operations', () => {
    it('should delete single vector by id', async () => {
      const manager = PineconeManager.getInstance();
      await manager.deleteOne('vec1');

      expect(mockIndexDeleteOne).toHaveBeenCalledWith({ id: 'vec1' });
    });

    it('should delete multiple vectors by ids', async () => {
      const manager = PineconeManager.getInstance();
      await manager.deleteMany(['vec1', 'vec2', 'vec3']);

      expect(mockIndexDeleteMany).toHaveBeenCalledWith({ ids: ['vec1', 'vec2', 'vec3'] });
    });

    it('should delete all vectors', async () => {
      const manager = PineconeManager.getInstance();
      await manager.deleteAll();

      expect(mockIndexDeleteAll).toHaveBeenCalled();
    });
  });

  describe('describeIndexStats', () => {
    it('should return index statistics', async () => {
      const manager = PineconeManager.getInstance();
      const stats = await manager.describeIndexStats();

      expect(stats).toEqual({
        dimension: 1536,
        indexFullness: 0.1,
        totalRecordCount: 100
      });
      expect(mockIndexDescribeStats).toHaveBeenCalled();
    });
  });

  describe('fetch', () => {
    it('should fetch vectors by ids', async () => {
      const manager = PineconeManager.getInstance();
      const result = await manager.fetch(['1', '2']);

      expect(result).toEqual({
        vectors: { '1': { id: '1', values: [0.1, 0.2] } }
      });
      expect(mockIndexFetch).toHaveBeenCalledWith({ ids: ['1', '2'] });
    });
  });

  describe('listPaginated', () => {
    it('should list vectors with pagination options', async () => {
      const manager = PineconeManager.getInstance();
      const options = { prefix: 'doc', limit: 10, paginationToken: 'token123' };

      const result = await manager.listPaginated(options);

      expect(result).toEqual({
        vectors: [{ id: '1' }, { id: '2' }],
        pagination: { next: 'token' }
      });
      expect(mockIndexListPaginated).toHaveBeenCalledWith(options);
    });

    it('should work without pagination options', async () => {
      const manager = PineconeManager.getInstance();
      await manager.listPaginated();

      expect(mockIndexListPaginated).toHaveBeenCalledWith(undefined);
    });
  });

  describe('index management', () => {
    it('should create index with default parameters', async () => {
      const manager = PineconeManager.getInstance();
      await manager.createIndex();

      expect(mockCreateIndex).toHaveBeenCalledWith({
        name: 'test-index-dev',
        dimension: 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
    });

    it('should create index with custom parameters', async () => {
      const manager = PineconeManager.getInstance();
      await manager.createIndex('custom-index', 1024, 'euclidean');

      expect(mockCreateIndex).toHaveBeenCalledWith({
        name: 'custom-index',
        dimension: 1024,
        metric: 'euclidean',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
    });

    it('should delete index', async () => {
      const manager = PineconeManager.getInstance();
      await manager.deleteIndex();

      expect(mockDeleteIndex).toHaveBeenCalledWith('test-index-dev');
    });

    it('should delete custom index', async () => {
      const manager = PineconeManager.getInstance();
      await manager.deleteIndex('custom-index');

      expect(mockDeleteIndex).toHaveBeenCalledWith('custom-index');
    });

    it('should reset index reference when deleting current index', async () => {
      const manager = PineconeManager.getInstance();
      // Force index creation
      manager.getIndex();
      expect(manager['index']).not.toBeNull();

      await manager.deleteIndex();

      expect(manager['index']).toBeNull();
    });

    it('should check if index exists', async () => {
      const manager = PineconeManager.getInstance();
      const exists = await manager.indexExists();

      expect(exists).toBe(true);
      expect(mockListIndexes).toHaveBeenCalled();
    });

    it('should list all indexes', async () => {
      const manager = PineconeManager.getInstance();
      const indexes = await manager.listIndexes();

      expect(indexes).toEqual({ indexes: [{ name: 'test-index-dev' }] });
      expect(mockListIndexes).toHaveBeenCalled();
    });
  });

  describe('recreateIndex', () => {
    it('should recreate existing index', async () => {
      const manager = PineconeManager.getInstance();
      jest.useFakeTimers();

      const recreatePromise = manager.recreateIndex();

      // Fast-forward through all timers after awaited calls schedule them.
      await jest.runAllTimersAsync();
      await recreatePromise;

      expect(console.log).toHaveBeenCalledWith('Deleting index: test-index-dev');
      expect(mockDeleteIndex).toHaveBeenCalledWith('test-index-dev');
      expect(console.log).toHaveBeenCalledWith('Creating index: test-index-dev');
      expect(mockCreateIndex).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✅ Index test-index-dev ready!');

      jest.useRealTimers();
    }, 30000);
  });

  describe('ensureIndexExists', () => {
    it('should create index if it does not exist', async () => {
      mockListIndexes.mockResolvedValueOnce({ indexes: [] });

      const manager = PineconeManager.getInstance();
      jest.useFakeTimers();

      const ensurePromise = manager.ensureIndexExists();
      await jest.runAllTimersAsync();
      await ensurePromise;

      expect(console.log).toHaveBeenCalledWith('Creating index: test-index-dev');
      expect(mockCreateIndex).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✅ Index test-index-dev created!');

      jest.useRealTimers();
    });

    it('should not create index if it already exists', async () => {
      const manager = PineconeManager.getInstance();
      await manager.ensureIndexExists();

      expect(console.log).toHaveBeenCalledWith('✅ Index test-index-dev already exists');
      expect(mockCreateIndex).not.toHaveBeenCalled();
    });
  });

  describe('setter methods', () => {
    it('should allow setting custom client', () => {
      const manager = PineconeManager.getInstance();
      const mockClient = { custom: true } as any;

      manager.setClient(mockClient);
      expect(manager.getClient()).toBe(mockClient);
    });

    it('should allow setting custom index', () => {
      const manager = PineconeManager.getInstance();
      const mockIdx = { custom: true } as any;

      manager.setIndex(mockIdx);
      expect(manager.getIndex()).toBe(mockIdx);
    });

    it('should allow changing index name', () => {
      const manager = PineconeManager.getInstance();
      manager.setIndexName('new-index-name');

      expect(manager['indexName']).toBe('new-index-name');
      expect(manager['index']).toBeNull(); // Index should be reset
    });
  });

  describe('Singleton behavior', () => {
    it('should maintain state across multiple references', () => {
      const manager1 = PineconeManager.getInstance();
      const manager2 = PineconeManager.getInstance();

      const mockClient = { test: 'client' } as any;
      manager1.setClient(mockClient);

      expect(manager2.getClient()).toBe(mockClient);
    });
  });
});
