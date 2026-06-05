// Removes need for dotenv-cli -e .env.local -- in
// npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const validateEnvVar = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

const env = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
};

export const DEBUG = env('DEBUG');
export const CHAT_MODEL = env('CHAT_MODEL');
export const EMBEDDING_MODEL = env('EMBEDDING_MODEL');
export const PINECONE_API_KEY = env('PINECONE_API_KEY');
export const PINECONE_INDEX_DEV = env('PINECONE_INDEX_DEV');
export const CLIENT_SECRET_FILE = env('CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2');
export const VECTOR_SIZE = env('VECTOR_SIZE');
export const DEFAULT_THRESHOLD = env('DEFAULT_THRESHOLD');

