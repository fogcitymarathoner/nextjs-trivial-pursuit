// lib/firebase/admin.ts
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Check if we're in a build environment
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NODE_ENV === 'production' && !process.env.FIREBASE_PRIVATE_KEY;

// Only initialize if credentials are available and we're not in a build-time context
const hasCredentials = () => {
  return !!(process.env.FIREBASE_PRIVATE_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
};

const normalizeServiceAccount = (parsed: Record<string, unknown>): ServiceAccount => {
  const projectId = parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  const privateKey = parsed.private_key;

  if (
    typeof projectId !== 'string' ||
    projectId.trim() === '' ||
    typeof clientEmail !== 'string' ||
    clientEmail.trim() === '' ||
    typeof privateKey !== 'string' ||
    privateKey.trim() === ''
  ) {
    throw new Error('Missing Firebase Admin credentials');
  }

  return {
    projectId,
    clientEmail,
    privateKey: cleanPrivateKey(privateKey),
  };
};

// Helper to get service account
const getServiceAccount = () => {
  const serviceAccountJsonOrPath = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

  if (serviceAccountJsonOrPath) {
    if (serviceAccountJsonOrPath.trim().startsWith('{')) {
      const parsed = JSON.parse(serviceAccountJsonOrPath);
      return normalizeServiceAccount(parsed);
    }

    const serviceAccountPath = resolve(serviceAccountJsonOrPath);
    if (existsSync(serviceAccountPath)) {
      const parsed = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      return normalizeServiceAccount(parsed);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials');
  }

  return {
    projectId,
    clientEmail,
    privateKey: cleanPrivateKey(privateKey),
  };
};

const cleanPrivateKey = (privateKey: string) => {
  let cleaned = privateKey.replace(/\\n/g, '\n');
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
};

// Initialize Admin SDK only if credentials exist and we're not in build time
let firebaseInitialized = getApps().length > 0;

if (!firebaseInitialized && hasCredentials() && !isBuildTime) {
  try {
    initializeApp({
      credential: cert(getServiceAccount()),
    });
    firebaseInitialized = true;
  } catch (error) {
    console.warn('Firebase Admin initialization skipped during build:', error);
  }
}

// Export adminAuth - this will be undefined if no app exists
// We need to handle this gracefully in the routes
export const adminAuth = firebaseInitialized ? getAuth() : null;

// Export a helper to check if Firebase is initialized
export const isFirebaseInitialized = () => firebaseInitialized || getApps().length > 0;
