import { initializeApp, getApps, cert, applicationDefault, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Check if we're in a build environment
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

// Only initialize if credentials are available and we're not in a build-time context
const hasValue = (value: string | undefined) => !!value?.trim();

const hasCompleteServiceAccount = (
  projectId: string | undefined,
  clientEmail: string | undefined,
  privateKey: string | undefined,
) => hasValue(projectId) && hasValue(clientEmail) && hasValue(privateKey);

const hasJsonServiceAccount = (value: string | undefined) => {
  return typeof value === 'string' && value.trim().startsWith('{');
};

const hasApplicationDefaultCredentials = () => {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT_ID ||
    process.env.K_SERVICE
  );
};

const getCredentialSets = () => [
  {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
  {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
  {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
  },
  {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
  },
];

const hasCredentials = () => {
  return (
    hasJsonServiceAccount(process.env.FIREBASE_PRIVATE_KEY) ||
    hasJsonServiceAccount(process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY) ||
    getCredentialSets().some(({ projectId, clientEmail, privateKey }) => {
      return hasCompleteServiceAccount(projectId, clientEmail, privateKey);
    }) ||
    hasApplicationDefaultCredentials()
  );
};

const normalizeServiceAccount = (parsed: Record<string, unknown>): ServiceAccount => {
  const projectId = parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
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

// Helper to get service account. Prefer the first complete credential set that
// can be assembled from runtime process.env values, falling back to the
// supporting next-public values when the server-side values are blank.
const getServiceAccount = () => {
  const serviceAccountJson = [process.env.FIREBASE_PRIVATE_KEY, process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY]
    .find(hasJsonServiceAccount);

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    return normalizeServiceAccount(parsed);
  }

  const credentials = getCredentialSets().find(({ projectId, clientEmail, privateKey }) => {
    return hasCompleteServiceAccount(projectId, clientEmail, privateKey);
  });

  if (!credentials) {
    throw new Error('Missing Firebase Admin credentials');
  }

  return {
    projectId: credentials.projectId!,
    clientEmail: credentials.clientEmail!,
    privateKey: cleanPrivateKey(credentials.privateKey!),
  };
};

const getCredential = () => {
  // GOOGLE_APPLICATION_CREDENTIALS and managed Google runtimes should use
  // Firebase Admin's standard Application Default Credentials flow directly.
  if (hasApplicationDefaultCredentials()) {
    return applicationDefault();
  }

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

export const getFirebaseAdminAuth = () => {
  initializeFirebaseAdmin();
  return adminAuth;
};
