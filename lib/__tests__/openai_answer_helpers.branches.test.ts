/**
 * Use hoisted jest.mock to ensure dependencies are mocked before import.
 */

// Create mock functions
const mockGetEmbedding = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
const mockChatCompletionCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: 'LLM ANSWER' } }]
});
const mockQuery = jest.fn();

// Mock OpenAIClientManager (replaces @/lib/openai)
jest.mock('@/lib/OpenAIClientManager', () => ({
  __esModule: true,
  default: {
    getEmbedding: mockGetEmbedding,
    getClient: () => ({ chat: { completions: { create: mockChatCompletionCreate } } }),
  },
}));

// Mock PineconeManager
jest.mock('@/lib/PineconeManager', () => ({
  __esModule: true,
  default: {
    getIndex: () => ({ query: mockQuery }),
  },
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
    expect(mockGetEmbedding).toHaveBeenCalledWith('Q?');
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
    mockQuery.mockResolvedValue(null);
    const res = await getAnswer('Q?', 0.5, false);
    expect(res).toContain('I cannot answer this question');
  });

  it('getAnswer uses context when matches present and returns LLM answer', async () => {
    const fake = {
      matches: [
        { id: '1', score: 0.9, metadata: { text: 'some context', page: 1, source: 'src' } }
      ]
    };
    mockQuery.mockResolvedValue(fake);
    const res = await getAnswer('Q?', 0.5, true);
    expect(res).toBe('LLM ANSWER');
  });
});
