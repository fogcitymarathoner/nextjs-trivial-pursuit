import * as fs from 'fs';
import * as path from 'path';

export const getPresidentTitles = async (): Promise<string[]> => {
  try {
    // Load from JSON file
    const dataPath = path.join(__dirname, '../data', 'presidents_clean_titles.json');
    const data = await fs.promises.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading president titles:', error);
    throw error;
  }
};