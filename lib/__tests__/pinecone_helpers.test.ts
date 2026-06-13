/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import PineconeManager from '../PineconeManager';

jest.mock('@/config/env', () => ({
  PINECONE_API_KEY: 'test-pinecone-api-key',
  PINECONE_INDEX_DEV: 'test-index',
  VECTOR_SIZE: '1536',
}));

type MockPineconeClient = {
  listIndexes: jest.MockedFunction<() => Promise<MockIndexListResponse>>;
  deleteIndex: jest.MockedFunction<(name: string) => Promise<void>>;
  createIndex: jest.MockedFunction<(options: unknown) => Promise<void>>;
};

type MockIndexListResponse = {
  indexes?: Array<{ name: string }>;
};

const createMockClient = (): MockPineconeClient => ({
  listIndexes: jest.fn<() => Promise<MockIndexListResponse>>(),
  deleteIndex: jest.fn<(name: string) => Promise<void>>(),
  createIndex: jest.fn<(options: unknown) => Promise<void>>(),
});

describe('PineconeManager index management', () => {
  let mockClient: MockPineconeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
    mockClient.deleteIndex.mockResolvedValue(undefined);
    mockClient.createIndex.mockResolvedValue(undefined);

    PineconeManager.setClient(mockClient as unknown as ReturnType<typeof PineconeManager.getClient>);
    PineconeManager.setIndex(null);
    PineconeManager.setIndexName('test-index');
  });

  afterEach(() => {
    jest.useRealTimers();
    PineconeManager.setClient(null);
    PineconeManager.setIndex(null);
  });

  describe('ensureIndexExists', () => {
    it('creates index when it does not exist', async () => {
      mockClient.listIndexes.mockResolvedValue({ indexes: [] });
      jest.useFakeTimers();

      const ensurePromise = PineconeManager.ensureIndexExists('test-index');
      await jest.runAllTimersAsync();
      await ensurePromise;

      expect(mockClient.createIndex).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test-index',
        dimension: 1536,
        metric: 'cosine',
      }));
    });

    it('does not create index when it exists', async () => {
      mockClient.listIndexes.mockResolvedValue({
        indexes: [{ name: 'test-index' }],
      });

      await PineconeManager.ensureIndexExists('test-index');

      expect(mockClient.createIndex).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      mockClient.listIndexes.mockRejectedValue(new Error('API Error'));

      await expect(PineconeManager.ensureIndexExists('test-index')).rejects.toThrow('API Error');
    });
  });

  describe('recreateIndex', () => {
    it('deletes and recreates index when it exists', async () => {
      mockClient.listIndexes
        .mockResolvedValueOnce({ indexes: [{ name: 'test-index' }] })
        .mockResolvedValueOnce({ indexes: [] });
      jest.useFakeTimers();

      const recreatePromise = PineconeManager.recreateIndex('test-index');
      await jest.runAllTimersAsync();
      await recreatePromise;

      expect(mockClient.deleteIndex).toHaveBeenCalledWith('test-index');
      expect(mockClient.createIndex).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-index' }));
    });

    it('creates index when it does not exist', async () => {
      mockClient.listIndexes.mockResolvedValue({ indexes: [] });
      jest.useFakeTimers();

      const recreatePromise = PineconeManager.recreateIndex('test-index');
      await jest.runAllTimersAsync();
      await recreatePromise;

      expect(mockClient.deleteIndex).not.toHaveBeenCalled();
      expect(mockClient.createIndex).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-index' }));
    });
  });
});
