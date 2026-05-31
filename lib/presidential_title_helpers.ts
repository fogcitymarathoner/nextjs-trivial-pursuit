import * as fs from 'fs';
import * as path from 'path';

export async function getPresidentTitles(): Promise<string[]> {
  // Load from JSON file
  const dataPath = path.join(__dirname, '../data', 'presidents_clean_titles.json');
  const data = await fs.promises.readFile(dataPath, 'utf-8');
  return JSON.parse(data);
}