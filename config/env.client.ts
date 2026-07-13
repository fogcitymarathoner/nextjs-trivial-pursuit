// config/env.client.ts
// This file is safe for client components - uses only NEXT_PUBLIC_* variables

const shouldWarnMissingEnv = process.env.NEXT_PUBLIC_DEBUG_ENV === 'true';

// These must use direct property access. Next.js replaces statically referenced
// NEXT_PUBLIC_* variables when it builds the browser bundle; process.env[key]
// cannot be analyzed and evaluates to undefined in the browser.
export const NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
export const NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
export const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
export const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
export const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
export const NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
export const NEXT_PUBLIC_FIRESTORE_DATABASE_ID = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
// Client-side debug flags
export const NEXT_PUBLIC_DEBUG = process.env.NEXT_PUBLIC_DEBUG;
export const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

// Add a check for critical client config
if ((!NEXT_PUBLIC_FIREBASE_PROJECT_ID || !NEXT_PUBLIC_FIREBASE_API_KEY) && shouldWarnMissingEnv) {
    console.error('WARNING: Firebase client configuration is missing! Please check your .env.local file');
}
