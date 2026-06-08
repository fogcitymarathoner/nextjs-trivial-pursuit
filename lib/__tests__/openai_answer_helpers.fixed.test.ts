/**
 * @jest-environment node
 */

describe('openai_answer_helpers (doMock + require) fixed', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('queryPinecone returns null when no matches', async () => {
    const mockGetOpenAIEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockQuery = jest.fn().mockResolvedValue({ matches: [] });

    jest.doMock('@/lib/openai', () => ({
      getOpenAIEmbedding: mockGetOpenAIEmbedding,
      getOpenAIClient: () => ({ chat: { completions: { create: jest.fn() } } })
    }));

    jest.doMock('@/lib/pinecone', () => ({
      getPineconeIndex: () => ({ query: mockQuery })
    }));

    const _mod = require('../openai_answer_helpers');
    console.log('DBG module keys:', Object.keys(_mod || {}));
    const { queryPinecone } = _mod;

    const res = await queryPinecone('Q?', 0.5);
    expect(res).toBeNull();
    expect(mockGetOpenAIEmbedding).toHaveBeenCalledWith('Q?');
  });

  it('getAnswer returns fallback when no context and fallback disabled', async () => {
    const mockGetOpenAIEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockCreate = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'LLM ANSWER' } }] });
    const mockQuery = jest.fn().mockResolvedValue(null);

    jest.doMock('@/lib/openai', () => ({
      getOpenAIEmbedding: mockGetOpenAIEmbedding,
      getOpenAIClient: () => ({ chat: { completions: { create: mockCreate } } })
    }));

    jest.doMock('@/lib/pinecone', () => ({
      getPineconeIndex: () => ({ query: mockQuery })
    }));

    const _mod = require('../openai_answer_helpers');
    console.log('DBG module keys:', Object.keys(_mod || {}));
    const { getAnswer } = _mod;

    const res = await getAnswer('Q?', 0.5, false);
    expect(res).toContain('I cannot answer this question');
  });

  it('getAnswer uses context when matches present and returns LLM answer', async () => {
    const mockGetOpenAIEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const mockCreate = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'LLM ANSWER' } }] });
    const mockQuery = jest.fn().mockResolvedValue({ matches: [{ id: '1', score: 0.9, metadata: { text: 'some context', page: 1, source: 'src' } }] });

    jest.doMock('@/lib/openai', () => ({
      getOpenAIEmbedding: mockGetOpenAIEmbedding,
      getOpenAIClient: () => ({ chat: { completions: { create: mockCreate } } })
    }));

    jest.doMock('@/lib/pinecone', () => ({
      getPineconeIndex: () => ({ query: mockQuery })
    }));

    const _mod = require('../openai_answer_helpers');
    console.log('DBG module keys:', Object.keys(_mod || {}));
    const { getAnswer } = _mod;

    const res = await getAnswer('Q?', 0.5, true);
    expect(res).toBe('LLM ANSWER');
    expect(mockCreate).toHaveBeenCalled();
  });
});
