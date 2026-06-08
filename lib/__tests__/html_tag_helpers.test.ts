// lib/__tests__/html_tag_helpers.test.ts
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

// Mock cheerio BEFORE importing the module being tested
jest.mock('cheerio', () => ({
  load: jest.fn(),
}));

// Now import the module being tested
import { removeHtmlTagsCheerio } from '../html_tag_helpers';

describe('removeHtmlTagsCheerio', () => {
  let mockCheerioLoad: jest.Mock;
  let mockText: jest.Mock;
  let mockCheerioInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup cheerio mock
    mockText = jest.fn();
    mockCheerioInstance = {
      text: mockText,
    };
    mockCheerioLoad = require('cheerio').load as jest.Mock;
  });

  describe('basic functionality', () => {
    it('should remove HTML tags from a simple string', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Hello World');

      const input = '<p>Hello World</p>';
      const result = removeHtmlTagsCheerio(input);

      expect(mockCheerioLoad).toHaveBeenCalledWith(input);
      expect(mockText).toHaveBeenCalled();
      expect(result).toBe('Hello World');
    });

    it('should handle nested HTML tags', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Hello Beautiful World');

      const input = '<div><p>Hello <strong>Beautiful</strong> World</p></div>';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe('Hello Beautiful World');
    });

    it('should handle multiple HTML tags', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('First Second Third');

      const input = '<h1>First</h1><p>Second</p><span>Third</span>';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe('First Second Third');
    });

    it('should preserve text content without HTML tags', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Plain text without tags');

      const input = 'Plain text without tags';
      const result = removeHtmlTagsCheerio(input);

      expect(mockCheerioLoad).toHaveBeenCalledWith(input);
      expect(result).toBe('Plain text without tags');
    });
  });

  describe('edge cases - falsy inputs', () => {
    it('should return empty string for null input', () => {
      const result = removeHtmlTagsCheerio(null);
      expect(result).toBe('');
      expect(mockCheerioLoad).not.toHaveBeenCalled();
    });

    it('should return empty string for undefined input', () => {
      const result = removeHtmlTagsCheerio(undefined);
      expect(result).toBe('');
      expect(mockCheerioLoad).not.toHaveBeenCalled();
    });

    it('should return empty string for empty string input', () => {
      const result = removeHtmlTagsCheerio('');
      expect(result).toBe('');
      expect(mockCheerioLoad).not.toHaveBeenCalled();
    });
  });

  describe('special characters and formatting', () => {
    it('should handle HTML entities', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Hello & World');

      const input = '<p>Hello &amp; World</p>';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe('Hello & World');
    });

    it('should handle line breaks and whitespace', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Line 1 Line 2 Line 3');

      const input = '<div>Line 1<br/>Line 2<br/>Line 3</div>';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe('Line 1 Line 2 Line 3');
    });

    it('should handle special Unicode characters', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Hello 世界 🌍');

      const input = '<p>Hello 世界 🌍</p>';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe('Hello 世界 🌍');
    });

    it('should handle script tags', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Visible Text');

      const input = '<p>Visible Text</p><script>alert("hidden");</script>';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe('Visible Text');
    });
  });

  describe('error handling', () => {
    it('should handle cheerio parsing errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCheerioLoad.mockImplementation(() => {
        throw new Error('Cheerio parsing error');
      });

      const input = '<invalid>html</invalid>';
      const result = removeHtmlTagsCheerio(input);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error parsing HTML:',
        expect.any(Error)
      );
      expect(result).toBe(String(input));

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed HTML', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCheerioLoad.mockImplementation(() => {
        throw new Error('Invalid HTML');
      });

      const input = '<p>Unclosed paragraph';
      const result = removeHtmlTagsCheerio(input);

      expect(result).toBe(String(input));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Buffer handling', () => {
    it('should handle Buffer input', () => {
      mockCheerioLoad.mockReturnValue(mockCheerioInstance);
      mockText.mockReturnValue('Content from buffer');

      const buffer = Buffer.from('<p>Content from buffer</p>');
      const result = removeHtmlTagsCheerio(buffer);

      expect(mockCheerioLoad).toHaveBeenCalledWith(buffer);
      expect(result).toBe('Content from buffer');
    });
  });
});