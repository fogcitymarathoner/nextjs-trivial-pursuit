import '@testing-library/jest-dom';
import { Request as CrossFetchRequest, Response as CrossFetchResponse } from 'cross-fetch';

jest.mock('@/lib/openai_answer_helpers', () => ({
  getAnswer: jest.fn(),
  getResultsFromVectorDB: jest.fn(),
}));

jest.mock('@/config/pinecone/pinecone_indexes', () => ({
  PINECONE_INDEXES: [
    {
      label: 'Production Index',
      indexName: 'prod-index',
      description: 'Production environment',
    },
  ],
  getIndexNameByLabel: jest.fn(),
}));

import { POST } from '../route';
import { getAnswer, getResultsFromVectorDB } from '@/lib/openai_answer_helpers';
import { PINECONE_INDEXES, getIndexNameByLabel } from '@/config/pinecone/pinecone_indexes';

const ResponseWithJson = Object.assign(CrossFetchResponse, {
  json: (body: unknown, init?: ResponseInit) =>
    new CrossFetchResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    }),
});

globalThis.Request = CrossFetchRequest as unknown as typeof globalThis.Request;
globalThis.Response = ResponseWithJson as unknown as typeof globalThis.Response;

const mockGetResultsFromVectorDB = getResultsFromVectorDB as jest.MockedFunction<typeof getResultsFromVectorDB>;
const mockGetAnswer = getAnswer as jest.MockedFunction<typeof getAnswer>;
const mockGetIndexNameByLabel = getIndexNameByLabel as jest.MockedFunction<typeof getIndexNameByLabel>;
const defaultPineconeIndexes = [
  {
    label: 'Production Index',
    indexName: 'prod-index',
    description: 'Production environment',
  },
];

describe('QA Route API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PINECONE_INDEXES as unknown as typeof defaultPineconeIndexes).splice(
      0,
      PINECONE_INDEXES.length,
      ...defaultPineconeIndexes,
    );

    // Default mock implementations
    mockGetIndexNameByLabel.mockReturnValue('test-index');
    mockGetResultsFromVectorDB.mockResolvedValue({
      matches: [
        {
          id: 'match1',
          score: 0.95,
          metadata: {
            text: 'Test content',
            source: 'test.pdf',
            page: 5,
          },
        },
      ],
    });
    mockGetAnswer.mockResolvedValue('This is the answer from AI');
  });

  describe('Request Validation', () => {
    it('returns 400 when question is missing', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Question is required' });
      expect(mockGetResultsFromVectorDB).not.toHaveBeenCalled();
    });

    it('returns 400 when question is empty string', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Question is required' });
    });

    it('returns 400 when question is not a string', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Question is required' });
    });

    it('trims whitespace from question', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: '  Hello World  ' }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Hello World',
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('Pinecone Index Configuration', () => {
    it('returns 500 when no indexes are configured', async () => {
      (PINECONE_INDEXES as unknown as typeof defaultPineconeIndexes).splice(0);

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'No Pinecone indexes are configured' });
      expect(mockGetResultsFromVectorDB).not.toHaveBeenCalled();
    });

    it('returns 400 when index label is invalid', async () => {
      mockGetIndexNameByLabel.mockReturnValue(undefined);

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          pineconeIndexLabel: 'invalid-label',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'No Pinecone index configured for label "invalid-label"' });
    });

    it('uses first index when no label is provided', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      await POST(request);

      expect(mockGetIndexNameByLabel).toHaveBeenCalledWith(PINECONE_INDEXES[0]?.label);
    });

    it('uses provided index label when specified', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          pineconeIndexLabel: 'custom-index',
        }),
      });

      await POST(request);

      expect(mockGetIndexNameByLabel).toHaveBeenCalledWith('custom-index');
    });
  });

  describe('Similarity Threshold', () => {
    it('uses default threshold 0.5 when not provided', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Test question',
        0.5,
        expect.any(String),
      );
    });

    it('uses provided threshold value', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          similarityThreshold: 0.8,
        }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Test question',
        0.8,
        expect.any(String),
      );
    });

    it('clamps threshold to minimum 0', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          similarityThreshold: -1,
        }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Test question',
        0,
        expect.any(String),
      );
    });

    it('clamps threshold to maximum 1', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          similarityThreshold: 2,
        }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Test question',
        1,
        expect.any(String),
      );
    });

    it('uses default threshold when value is not a number', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          similarityThreshold: 'invalid',
        }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Test question',
        0.5,
        expect.any(String),
      );
    });

    it('uses default threshold when value is Infinity', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          similarityThreshold: Infinity,
        }),
      });

      await POST(request);

      expect(mockGetResultsFromVectorDB).toHaveBeenCalledWith(
        'Test question',
        0.5,
        expect.any(String),
      );
    });
  });

  describe('Fallback to General Knowledge', () => {
    it('defaults to true when not provided', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      await POST(request);

      expect(mockGetAnswer).toHaveBeenCalledWith(
        'Test question',
        expect.any(Number),
        true,
        expect.any(String),
        expect.any(Object),
      );
    });

    it('uses false when provided', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          fallbackToGeneralKnowledge: false,
        }),
      });

      await POST(request);

      expect(mockGetAnswer).toHaveBeenCalledWith(
        'Test question',
        expect.any(Number),
        false,
        expect.any(String),
        expect.any(Object),
      );
    });

    it('uses true when explicitly provided', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          fallbackToGeneralKnowledge: true,
        }),
      });

      await POST(request);

      expect(mockGetAnswer).toHaveBeenCalledWith(
        'Test question',
        expect.any(Number),
        true,
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('Vector DB Results', () => {
    it('returns needsFallbackDecision when no matches and fallback disabled', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({ matches: [] });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          fallbackToGeneralKnowledge: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        answer: null,
        matches: [],
        hasContext: false,
        needsFallbackDecision: true,
        message: 'No Pinecone results were found at this threshold.',
      });
      expect(mockGetAnswer).not.toHaveBeenCalled();
    });

    it('calls getAnswer when matches exist', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      await POST(request);

      expect(mockGetAnswer).toHaveBeenCalledTimes(1);
    });

    it('calls getAnswer when no matches but fallback enabled', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({ matches: [] });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          fallbackToGeneralKnowledge: true,
        }),
      });

      await POST(request);

      expect(mockGetAnswer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Format', () => {
    it('returns correct response format with matches', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({
        answer: 'This is the answer from AI',
        matches: [
          {
            id: 'match1',
            score: 0.95,
            metadata: {
              text: 'Test content',
              source: 'test.pdf',
              page: 5,
            },
          },
        ],
        hasContext: true,
        needsFallbackDecision: false,
        message: null,
      });
    });

    it('returns empty matches array when queryResult is null', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue(null);

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches).toEqual([]);
    });

    it('returns empty matches array when queryResult has no matches', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({ matches: [] });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          fallbackToGeneralKnowledge: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches).toEqual([]);
      expect(data.hasContext).toBe(false);
    });
  });

  describe('Match Serialization', () => {
    it('serializes match metadata correctly', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            id: 'custom-id',
            score: 0.88,
            metadata: {
              text: 'Custom text',
              source: 'custom.pdf',
              page: 10,
              extraField: 'extra value',
            },
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0]).toEqual({
        id: 'custom-id',
        score: 0.88,
        metadata: {
          text: 'Custom text',
          source: 'custom.pdf',
          page: 10,
          extraField: 'extra value',
        },
      });
    });

    it('handles missing text in metadata', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            id: 'match1',
            score: 0.95,
            metadata: {
              source: 'test.pdf',
            },
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0].metadata.text).toBe('');
    });

    it('handles null score', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            id: 'match1',
            score: null,
            metadata: { text: 'Test' },
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0].score).toBe(null);
    });

    it('handles missing id by defaulting to empty string', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            score: 0.95,
            metadata: { text: 'Test' },
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0].id).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('handles getResultsFromVectorDB error', async () => {
      mockGetResultsFromVectorDB.mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database connection failed' });
    });

    it('handles getAnswer error', async () => {
      mockGetAnswer.mockRejectedValue(new Error('OpenAI API error'));

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'OpenAI API error' });
    });

    it('handles non-Error exceptions', async () => {
      mockGetResultsFromVectorDB.mockRejectedValue('String error');

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Unable to answer the question' });
    });

    it('handles invalid JSON body', async () => {
      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty matches array with undefined metadata', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            id: 'match1',
            score: 0.95,
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0].metadata).toEqual({ text: '' });
    });

    it('handles page as string in metadata', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            id: 'match1',
            score: 0.95,
            metadata: {
              text: 'Test',
              page: '5',
            },
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0].metadata.page).toBe('5');
    });

    it('handles numeric page in metadata', async () => {
      mockGetResultsFromVectorDB.mockResolvedValue({
        matches: [
          {
            id: 'match1',
            score: 0.95,
            metadata: {
              text: 'Test',
              page: 42,
            },
          },
        ],
      });

      const request = new Request('http://localhost/api/qa/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.matches[0].metadata.page).toBe(42);
    });
  });
});
