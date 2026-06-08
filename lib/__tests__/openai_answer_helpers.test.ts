// lib/__tests__/openai_answer_helpers.test.ts
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

import {describe, expect, it} from '@jest/globals';
import {
  extractMetadata,
  extractTextFromAnswer,
  formatAnswerForDisplay,
  isValidAnswer,
  mergeAnswers,
  parseAnswer,
  queryPinecone,
  getAnswer
} from '../openai_answer_helpers';

describe('openai_answer_helpers', () => {
  describe('parseAnswer', () => {
    it('should parse a valid JSON answer', () => {
      const answer = '{"text": "Hello world", "confidence": 0.95}';
      const result = parseAnswer(answer);
      expect(result).toEqual({
        text: 'Hello world',
        confidence: 0.95
      });
    });

    it('should handle malformed JSON', () => {
      const answer = 'This is not JSON';
      const result = parseAnswer(answer);
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const answer = '';
      const result = parseAnswer(answer);
      expect(result).toBeNull();
    });

    it('should handle null or undefined input', () => {
      expect(parseAnswer(null as any)).toBeNull();
      expect(parseAnswer(undefined as any)).toBeNull();
    });
  });

  describe('extractTextFromAnswer', () => {
    it('should extract text from string answer', () => {
      const answer = 'This is a plain text answer';
      const result = extractTextFromAnswer(answer);
      expect(result).toBe('This is a plain text answer');
    });

    it('should extract text from object answer', () => {
      const answer = { text: 'Extracted text', other: 'data' };
      const result = extractTextFromAnswer(answer);
      expect(result).toBe('Extracted text');
    });

    it('should handle nested text property', () => {
      const answer = { content: { text: 'Nested text' }, metadata: {} };
      const result = extractTextFromAnswer(answer);
      expect(result).toBe('Nested text');
    });

    it('should return empty string for invalid input', () => {
      expect(extractTextFromAnswer(null)).toBe('');
      expect(extractTextFromAnswer(undefined)).toBe('');
      expect(extractTextFromAnswer(123)).toBe('');
    });
  });

  describe('isValidAnswer', () => {
    it('should return true for valid string answer', () => {
      expect(isValidAnswer('Valid answer text')).toBe(true);
    });

    it('should return true for valid object answer with text', () => {
      expect(isValidAnswer({ text: 'Valid answer' })).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidAnswer('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(isValidAnswer('   ')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidAnswer(null)).toBe(false);
      expect(isValidAnswer(undefined)).toBe(false);
    });

    it('should return false for object without text property', () => {
      expect(isValidAnswer({ other: 'data' })).toBe(false);
    });

    it('should return false for object with empty text', () => {
      expect(isValidAnswer({ text: '' })).toBe(false);
      expect(isValidAnswer({ text: '   ' })).toBe(false);
    });
  });

  describe('formatAnswerForDisplay', () => {
    it('should format plain text answer', () => {
      const answer = 'Simple answer';
      const result = formatAnswerForDisplay(answer);
      expect(result).toContain('Simple answer');
    });

    it('should handle multiline text', () => {
      const answer = 'Line 1\nLine 2\nLine 3';
      const result = formatAnswerForDisplay(answer);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('should strip excessive whitespace', () => {
      const answer = '  Too   many    spaces  ';
      const result = formatAnswerForDisplay(answer);
      expect(result).toBe('Too many spaces');
    });

    it('should handle object answers', () => {
      const answer = { text: 'Object answer', confidence: 0.9 };
      const result = formatAnswerForDisplay(answer);
      expect(result).toContain('Object answer');
    });

    it('should handle HTML escaping', () => {
      const answer = 'Text with <script>alert("xss")</script>';
      const result = formatAnswerForDisplay(answer);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should return empty string for invalid input', () => {
      expect(formatAnswerForDisplay(null)).toBe('');
      expect(formatAnswerForDisplay(undefined)).toBe('');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from object answer', () => {
      const answer = {
        text: 'Answer',
        confidence: 0.95,
        model: 'gpt-4',
        tokens: 150,
        metadata: { source: 'API', version: '1.0' }
      };
      const result = extractMetadata(answer);
      expect(result).toMatchObject({
        confidence: 0.95,
        model: 'gpt-4',
        tokens: 150,
        source: 'API',
        version: '1.0'
      });
    });

    it('should handle missing metadata', () => {
      const answer = { text: 'Simple answer' };
      const result = extractMetadata(answer);
      expect(result).toEqual({});
    });

    it('should extract from nested structure', () => {
      const answer = {
        data: {
          text: 'Answer',
          meta: {
            confidence: 0.85,
            timestamp: '2024-01-01'
          }
        }
      };
      const result = extractMetadata(answer);
      expect(result).toEqual({});
    });

    it('should handle string answers (no metadata)', () => {
      const answer = 'Plain text answer';
      const result = extractMetadata(answer);
      expect(result).toEqual({});
    });

    it('should extract specific metadata fields only', () => {
      const answer = {
        text: 'Answer',
        confidence: 0.95,
        temperature: 0.7,
        max_tokens: 100,
        random_field: 'ignore'
      };
      const result = extractMetadata(answer, ['confidence', 'temperature']);
      expect(result).toEqual({
        confidence: 0.95,
        temperature: 0.7
      });
      expect(result).not.toHaveProperty('max_tokens');
      expect(result).not.toHaveProperty('random_field');
    });
  });

  describe('mergeAnswers', () => {
    it('should merge two valid answers', () => {
      const answer1 = { text: 'First answer', confidence: 0.8 };
      const answer2 = { text: 'Second answer', confidence: 0.9 };
      const result = mergeAnswers([answer1, answer2]);
      expect(result.text).toContain('First answer');
      expect(result.text).toContain('Second answer');
      expect(result.metadata.average_confidence).toBe(0.85);
    });

    it('should handle one invalid answer', () => {
      const answer1 = { text: 'Valid answer' };
      const answer2 = null;
      const result = mergeAnswers([answer1, answer2]);
      expect(result).toEqual(answer1);
    });

    it('should handle both invalid answers', () => {
      const result = mergeAnswers([null, undefined]);
      expect(result).toBeNull();
    });

    it('should combine text with separator', () => {
      const answer1 = 'First part.';
      const answer2 = 'Second part.';
      const result = mergeAnswers([answer1, answer2], { separator: ' ' });
      expect(result.text).toBe('First part. Second part.');
    });

    it('should use custom merge strategy', () => {
      const answer1 = { text: 'A', score: 10 };
      const answer2 = { text: 'B', score: 20 };
      const mergeStrategy = (a: any, b: any) => ({
        text: a.text + b.text,
        score: Math.max(a.score, b.score)
      });
      const result = mergeAnswers([answer1, answer2], { strategy: mergeStrategy });
      expect(result).toEqual({
        text: 'AB',
        score: 20
      });
    });

    it('should handle array of answers', () => {
      const answers = [
        { text: 'One' },
        { text: 'Two' },
        { text: 'Three' }
      ];
      const result = mergeAnswers(answers);
      expect(result.text).toContain('One');
      expect(result.text).toContain('Two');
      expect(result.text).toContain('Three');
    });

    it('should deduplicate similar answers', () => {
      const answers = [
        'The answer is 42',
        'The answer is 42',
        'Different answer'
      ];
      const result = mergeAnswers(answers, { deduplicate: true });
      const occurrences = (result.text.match(/The answer is 42/g) || []).length;
      expect(occurrences).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long answers', () => {
      const longAnswer = 'A'.repeat(100000);
      const result = extractTextFromAnswer(longAnswer);
      expect(result).toBe(longAnswer);
      expect(result.length).toBe(100000);
    });

    it('should handle Unicode and emoji', () => {
      const answer = 'Hello 🌍 World! こんにちは';
      const result = extractTextFromAnswer(answer);
      expect(result).toBe('Hello 🌍 World! こんにちは');
    });

    it('should handle special characters', () => {
      const answer = 'Special chars: !@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`';
      const result = extractTextFromAnswer(answer);
      expect(result).toBe(answer);
    });
  });

    describe('Pinecone/OpenAI integration (mocked)', () => {
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
});