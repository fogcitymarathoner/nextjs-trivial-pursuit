// config/env.server.ts
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const shouldWarnMissingEnv = process.env.DEBUG_ENV === 'true';

// More permissive version that logs but doesn't throw immediately
export const envServer = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    if (shouldWarnMissingEnv) {
      console.warn(`${key} is not set in environment variables`);
    }
    return undefined;
  }
  return value;
};

export const DEBUG = envServer('DEBUG');
export const CHAT_MODEL = envServer('CHAT_MODEL');
export const EMBEDDING_MODEL = envServer('EMBEDDING_MODEL');
export const PINECONE_API_KEY = envServer('PINECONE_API_KEY');
export const VECTOR_SIZE = envServer('VECTOR_SIZE');
export const DEFAULT_THRESHOLD = envServer('DEFAULT_THRESHOLD');
export const PINECONE_INDEX_DEV = envServer('PINECONE_INDEX_DEV') || '';

export const NEXT_PUBLIC_FIREBASE_PROJECT_ID = envServer('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
export const NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = envServer('NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL')
export const NEXT_PUBLIC_FIREBASE_PRIVATE_KEY= envServer('NEXT_PUBLIC_FIREBASE_PRIVATE_KEY')
export const NEXT_PUBLIC_FIREBASE_API_KEY = envServer('NEXT_PUBLIC_FIREBASE_API_KEY')
export const FIREBASE_PRIVATE_KEY = envServer('FIREBASE_PRIVATE_KEY')

// Add a check
if (!PINECONE_INDEX_DEV && shouldWarnMissingEnv) {
  console.error('WARNING: PINECONE_INDEX_DEV is not set! Please check your .env.local file');
}
