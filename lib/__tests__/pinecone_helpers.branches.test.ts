import { jest } from '@jest/globals';

describe('pinecone_helpers branch coverage', () => {
  let realSetTimeout: any;
  beforeEach(() => {
    jest.resetModules();
    realSetTimeout = (global as any).setTimeout;
    // Make setTimeout execute callbacks immediately to avoid long waits
    (global as any).setTimeout = (fn: any, _ms: number) => {
      fn();
      return 1 as any;
    };
  });

  afterEach(() => {
    (global as any).setTimeout = realSetTimeout;
  });

  test('recreateIndex deletes existing index then creates new one', async () => {
    const indexName = 'test-index';
    const pc: any = {
      listIndexes: jest.fn()
        .mockResolvedValueOnce({ indexes: [{ name: indexName }] }) // initial exists
        .mockResolvedValueOnce({ indexes: [] }), // after deletion
      deleteIndex: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined)
    };

    const { recreateIndex } = await import('../pinecone_helpers');
    await recreateIndex(pc as any, indexName);

    expect(pc.deleteIndex).toHaveBeenCalled();
    expect(pc.createIndex).toHaveBeenCalled();
  });

  test('recreateIndex creates when index does not exist', async () => {
    const indexName = 'new-index';
    const pc: any = {
      listIndexes: jest.fn().mockResolvedValue({ indexes: [] }),
      deleteIndex: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined)
    };

    const { recreateIndex } = await import('../pinecone_helpers');
    await recreateIndex(pc as any, indexName);

    expect(pc.deleteIndex).not.toHaveBeenCalled();
    expect(pc.createIndex).toHaveBeenCalled();
  });

  test('createIndexIfNotExists does not create when present', async () => {
    const indexName = 'exists';
    const pc: any = {
      listIndexes: jest.fn().mockResolvedValue({ indexes: [{ name: indexName }] }),
      createIndex: jest.fn().mockResolvedValue(undefined)
    };

    const { createIndexIfNotExists } = await import('../pinecone_helpers');
    await createIndexIfNotExists(pc as any, indexName);
    expect(pc.createIndex).not.toHaveBeenCalled();
  });

  test('createIndexIfNotExists creates when absent', async () => {
    const indexName = 'absent';
    const pc: any = {
      listIndexes: jest.fn().mockResolvedValue({ indexes: [] }),
      createIndex: jest.fn().mockResolvedValue(undefined)
    };

    const { createIndexIfNotExists } = await import('../pinecone_helpers');
    await createIndexIfNotExists(pc as any, indexName);
    expect(pc.createIndex).toHaveBeenCalled();
  });
});
