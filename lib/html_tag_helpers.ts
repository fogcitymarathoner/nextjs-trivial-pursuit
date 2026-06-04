import * as cheerio from 'cheerio';
import { AnyNode } from 'domhandler';

export const removeHtmlTagsCheerio = (
  input: string | AnyNode | AnyNode[] | Buffer<ArrayBufferLike> | null | undefined
): string => {
  // Early return for falsy values (null, undefined, empty string)
  if (!input) return '';

  try {
    const $ = cheerio.load(input);
    return $.text();
  } catch (error) {
    console.error('Error parsing HTML:', error);
    // Fallback: convert input to string if parsing fails
    return String(input);
  }
}