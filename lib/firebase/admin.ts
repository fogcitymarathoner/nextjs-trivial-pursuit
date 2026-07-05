import { initializeApp, getApps, cert, applicationDefault, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Check if we're in a build environment
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

// Only initialize if credentials are available and we're not in a build-time context
const hasCredentials = () => {
  return !!(process.env.FIREBASE_PRIVATE_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCP_PROJECT_ID ||
      process.env.K_SERVICE ||
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
  const serviceAccountJsonOrPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

  if (serviceAccountJsonOrPrivateKey) {
    if (serviceAccountJsonOrPrivateKey.trim().startsWith('{')) {
      const parsed = JSON.parse(serviceAccountJsonOrPrivateKey);
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

const getCredential = () => {
  try {
    return cert(getServiceAccount());
  } catch (error) {
    if (process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY) {
      throw error;
    }

    return applicationDefault();
  }
};

const cleanPrivateKey = (privateKey: string) => {
  let cleaned = privateKey.replace(/\\n/g, '\n');
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
};

let firebaseInitialized = getApps().length > 0;
export let adminAuth = firebaseInitialized ? getAuth() : null;

const initializeFirebaseAdmin = () => {
  if (firebaseInitialized || getApps().length > 0) {
    firebaseInitialized = true;
    adminAuth ??= getAuth();
    return;
  }

  if (isBuildTime || !hasCredentials()) {
    return;
  }

  try {
    initializeApp({
      credential: getCredential(),
    });
    firebaseInitialized = true;
    adminAuth = getAuth();
  } catch (error) {
    console.warn('Firebase Admin initialization skipped:', error);
  }
};

// Export a helper to check if Firebase is initialized
export const isFirebaseInitialized = () => {
  initializeFirebaseAdmin();
  return firebaseInitialized || getApps().length > 0;
};
