import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
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

describe('PineconeManager extra branches', () => {
  let client: MockPineconeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockClient();
    PineconeManager.setClient(client as unknown as ReturnType<typeof PineconeManager.getClient>);
    PineconeManager.setIndex(null);
    PineconeManager.setIndexName('test-index');
  });

  afterEach(() => {
    jest.useRealTimers();
    PineconeManager.setClient(null);
    PineconeManager.setIndex(null);
  });

  it('ensureIndexExists should throw when create fails', async () => {
    client.listIndexes.mockResolvedValue({ indexes: [] });
    client.createIndex.mockRejectedValue(new Error('create-fail'));

    await expect(PineconeManager.ensureIndexExists('test-index')).rejects.toThrow('create-fail');
  });

  it('recreateIndex should throw when deleteIndex fails', async () => {
    client.listIndexes.mockResolvedValue({ indexes: [{ name: 'test-index' }] });
    client.deleteIndex.mockRejectedValue(new Error('delete-fail'));

    await expect(PineconeManager.recreateIndex('test-index')).rejects.toThrow('delete-fail');
  });
});
