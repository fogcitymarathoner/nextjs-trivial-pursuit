// lib/firebase/admin.ts
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FIREBASE_PRIVATE_KEY,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
  NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY
} from '@/config/env.server';
const cleanPrivateKey = (privateKey: string) => {
  let cleaned = privateKey.replace(/\\n/g, '\n');
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned;
};

const parseServiceAccount = (rawValue: string): ServiceAccount => {
  const trimmedValue = rawValue.trim();
  const jsonValue = trimmedValue.startsWith('{')
    ? trimmedValue
    : readFileSync(resolve(process.cwd(), trimmedValue), 'utf8');
  const parsed = JSON.parse(jsonValue) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Firebase service account is missing project_id, client_email, or private_key');
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: cleanPrivateKey(parsed.private_key),
  };
};

const getServiceAccount = (): ServiceAccount => {
  const serviceAccountJsonOrPath = FIREBASE_PRIVATE_KEY;

  if (serviceAccountJsonOrPath) {
    if (serviceAccountJsonOrPath.trim().startsWith('{') || existsSync(resolve(process.cwd(), serviceAccountJsonOrPath))) {
      return parseServiceAccount(serviceAccountJsonOrPath);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY_VALUE || NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials');
  }

  return {
    projectId,
    clientEmail,
    privateKey: cleanPrivateKey(privateKey),
  };
};

// Initialize Admin SDK only once
if (!getApps().length) {
  initializeApp({
    credential: cert(getServiceAccount()),
  });
}

export const adminAuth = getAuth();
