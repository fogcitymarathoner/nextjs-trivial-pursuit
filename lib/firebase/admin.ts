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

const hasCredentials = () => {
  return (
    hasJsonServiceAccount(process.env.FIREBASE_PRIVATE_KEY) ||
    hasJsonServiceAccount(process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY) ||
    hasCompleteServiceAccount(
      process.env.FIREBASE_PROJECT_ID,
      process.env.FIREBASE_CLIENT_EMAIL,
      process.env.FIREBASE_PRIVATE_KEY,
    ) ||
    hasCompleteServiceAccount(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
      process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
    ) ||
    hasApplicationDefaultCredentials()
  );
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

// Helper to get service account. Keep credential namespaces together so a
// stray FIREBASE_PRIVATE_KEY cannot be mixed with NEXT_PUBLIC project/email.
const getServiceAccount = () => {
  const serviceAccountJson = [process.env.FIREBASE_PRIVATE_KEY, process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY]
    .find(hasJsonServiceAccount);

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    return normalizeServiceAccount(parsed);
  }

  const credentialSets = [
    {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
    {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
    },
  ];

  const credentials = credentialSets.find(({ projectId, clientEmail, privateKey }) => {
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
