// openai_answer_helpers.extra.test.ts

// IMPORTANT: All mocks MUST be defined before ANY imports
type PineconeQueryResult = { matches: Array<unknown> };

const mockQuery = jest.fn<() => Promise<PineconeQueryResult>>();

jest.mock('@/lib/PineconeManager', () => ({
  __esModule: true,
  default: {
    getIndex: jest.fn().mockReturnValue({ query: mockQuery }),
  },
}));

jest.mock('@/lib/OpenAIClientManager', () => ({
  __esModule: true,
  default: {
    getEmbedding: jest.fn(),
    getClient: jest.fn(),
  },
}));

jest.mock('@/config/env', () => ({
  DEBUG: 'false',
  CHAT_MODEL: 'gpt-3.5-turbo',
  DEFAULT_THRESHOLD: '0.4',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  PINECONE_API_KEY: 'test-api-key',
  PINECONE_INDEX: 'test-index',
  PINECONE_INDEX_DEV: 'test-index',
  VECTOR_SIZE: '1536',
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import OpenAIClientManager from '../OpenAIClientManager';
import { mergeAnswers, getAnswer } from '../openai_answer_helpers';

// Define the return type for the metadata
type MergedAnswerResult = {
  text: string;
  metadata: {
    average_confidence?: number;
    [key: string]: unknown;
  };
} | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetEmbedding = OpenAIClientManager.getEmbedding as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetClient = OpenAIClientManager.getClient as any;

describe('openai_answer_helpers extra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    mockQuery.mockResolvedValue({ matches: [] });
  });

  it('mergeAnswers should use strategy override', () => {
    const strategy = jest.fn().mockReturnValue({ text: 'STRAT', metadata: {} });
    const res = mergeAnswers(['a', 'b'], { strategy });
    expect(strategy).toHaveBeenCalledWith('a', 'b');
    expect(res?.text).toBe('STRAT');
  });

  it('mergeAnswers should compute average confidence', () => {
    const res = mergeAnswers([
      { text: 'A', confidence: 0.8 },
      { text: 'B', confidence: 0.6 }
    ]) as MergedAnswerResult;

    expect(res).not.toBeNull();
    expect(res?.metadata.average_confidence).toBe(0.7);
  });

  it('getAnswer should handle empty completion choices', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockCreate = jest.fn() as any;
    mockCreate.mockResolvedValue({ choices: [] });

    mockGetClient.mockReturnValue({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    });

    const result = await getAnswer('question-empty', 0.5, true);
    expect(result).toContain("couldn't generate");
  });
});
