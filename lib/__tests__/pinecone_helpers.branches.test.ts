import { jest } from '@jest/globals';
import PineconeManager from '@/lib/PineconeManager';

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

describe('PineconeManager branch coverage', () => {
  let client: MockPineconeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockClient();
    client.deleteIndex.mockResolvedValue(undefined);
    client.createIndex.mockResolvedValue(undefined);

    PineconeManager.setClient(client as unknown as ReturnType<typeof PineconeManager.getClient>);
    PineconeManager.setIndex(null);
    PineconeManager.setIndexName('test-index');
  });

  afterEach(() => {
    jest.useRealTimers();
    PineconeManager.setClient(null);
    PineconeManager.setIndex(null);
  });

  test('recreateIndex deletes existing index then creates new one', async () => {
    client.listIndexes
      .mockResolvedValueOnce({ indexes: [{ name: 'test-index' }] })
      .mockResolvedValueOnce({ indexes: [] });
    jest.useFakeTimers();

    const recreatePromise = PineconeManager.recreateIndex('test-index');
    await jest.runAllTimersAsync();
    await recreatePromise;

    expect(client.deleteIndex).toHaveBeenCalledWith('test-index');
    expect(client.createIndex).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-index' }));
  });

  test('recreateIndex creates when index does not exist', async () => {
    client.listIndexes.mockResolvedValue({ indexes: [] });
    jest.useFakeTimers();

    const recreatePromise = PineconeManager.recreateIndex('new-index');
    await jest.runAllTimersAsync();
    await recreatePromise;

    expect(client.deleteIndex).not.toHaveBeenCalled();
    expect(client.createIndex).toHaveBeenCalledWith(expect.objectContaining({ name: 'new-index' }));
  });

  test('ensureIndexExists does not create when present', async () => {
    client.listIndexes.mockResolvedValue({ indexes: [{ name: 'exists' }] });

    await PineconeManager.ensureIndexExists('exists');

    expect(client.createIndex).not.toHaveBeenCalled();
  });

  test('ensureIndexExists creates when absent', async () => {
    client.listIndexes.mockResolvedValue({ indexes: [] });
    jest.useFakeTimers();

    const ensurePromise = PineconeManager.ensureIndexExists('absent');
    await jest.runAllTimersAsync();
    await ensurePromise;

    expect(client.createIndex).toHaveBeenCalledWith(expect.objectContaining({ name: 'absent' }));
  });
});
