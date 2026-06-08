/**
 * @jest-environment node
 */

// DO NOT mock the entire module - test the real implementation
import { getPresidentTitles } from '../presidential_title_helpers';
import * as fs from 'fs';
import * as path from 'path';

// Mock only the file system dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

describe('Presidential Titles Helpers', () => {
  const mockDataPath = '/mock/path/presidents_clean_titles.json';
  const mockTitles = [
    'George Washington - 1st President',
    'John Adams - 2nd President',
    'Thomas Jefferson - 3rd President',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockReturnValue(mockDataPath);
  });

  it('successfully loads president titles from JSON file', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTitles));

    const result = await getPresidentTitles();

    expect(result).toEqual(mockTitles);
    expect(fs.promises.readFile).toHaveBeenCalledWith(mockDataPath, 'utf-8');
  });

  it('handles file read errors', async () => {
    const error = new Error('File not found');
    (fs.promises.readFile as jest.Mock).mockRejectedValue(error);

    await expect(getPresidentTitles()).rejects.toThrow('File not found');
  });

  it('handles malformed JSON', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json {');

    await expect(getPresidentTitles()).rejects.toThrow();
  });
});