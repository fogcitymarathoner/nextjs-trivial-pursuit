/**
 * Use hoisted jest.mock to ensure dependencies are mocked before import.
 */

const mockGetOpenAIEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
const mockCreate = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'LLM ANSWER' } }] });
const mockQuery = jest.fn();

jest.mock('@/lib/openai', () => ({
  getOpenAIEmbedding: mockGetOpenAIEmbedding,
  getOpenAIClient: () => ({ chat: { completions: { create: mockCreate } } })
}));

jest.mock('@/lib/pinecone', () => ({
  getPineconeIndex: () => ({ query: mockQuery })
}));

import { queryPinecone, getAnswer } from '../openai_answer_helpers';

describe('openai_answer_helpers (hoisted mocks)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEBUG = 'true';
  });

  afterEach(() => {
    delete process.env.DEBUG;
  });

  it('queryPinecone returns null when no matches', async () => {
    mockQuery.mockResolvedValue({ matches: [] });
    const res = await queryPinecone('Q?', 0.5);
    expect(res).toBeNull();
    expect(mockGetOpenAIEmbedding).toHaveBeenCalledWith('Q?');
  });

  it('queryPinecone filters by threshold and returns matches', async () => {
    const fake = {
      matches: [
        { id: '1', score: 0.9, metadata: { text: 'A' } },
        { id: '2', score: 0.2, metadata: { text: 'B' } }
      ]
    };
    mockQuery.mockResolvedValue(fake);
    const res = await queryPinecone('Q?', 0.5);
    expect(res).not.toBeNull();
    expect(res!.matches!.length).toBe(1);
  });

  it('getAnswer returns fallback when no context and fallback disabled', async () => {
    mockQuery.mockResolvedValue(null as any);
    const res = await getAnswer('Q?', 0.5, false);
    expect(res).toContain('I cannot answer this question');
  });

  it('getAnswer uses context when matches present and returns LLM answer', async () => {
    const fake = { matches: [{ id: '1', score: 0.9, metadata: { text: 'some context', page: 1, source: 'src' } }] };
    mockQuery.mockResolvedValue(fake);
    const res = await getAnswer('Q?', 0.5, true);
    expect(res).toBe('LLM ANSWER');
  });
});
