// config/env.server.ts
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

// More permissive version that logs but doesn't throw immediately
const envServer = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    console.warn(`${key} is not set in environment variables`);
    return undefined;
  }
  return value;
};

export const DEBUG = envServer('DEBUG');
export const CHAT_MODEL = envServer('CHAT_MODEL');
export const EMBEDDING_MODEL = envServer('EMBEDDING_MODEL');
export const PINECONE_API_KEY = envServer('PINECONE_API_KEY');
export const CLIENT_SECRET_FILE = envServer('CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2');
export const VECTOR_SIZE = envServer('VECTOR_SIZE');
export const DEFAULT_THRESHOLD = envServer('DEFAULT_THRESHOLD');
export const PINECONE_INDEX_DEV = envServer('PINECONE_INDEX_DEV') || '';

// Add a check
if (!PINECONE_INDEX_DEV) {
  console.error('WARNING: PINECONE_INDEX_DEV is not set! Please check your .env.local file');
}