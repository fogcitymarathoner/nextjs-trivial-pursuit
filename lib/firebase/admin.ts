// lib/firebase/admin.ts
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
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

// Initialize Admin SDK only if credentials exist and we're not in build time
if (!getApps().length && hasCredentials() && !isBuildTime) {
  try {
    const cleanPrivateKey = (privateKey: string) => {
      let cleaned = privateKey.replace(/\\n/g, '\n');
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned;
    };

    const getServiceAccount = () => {
      const serviceAccountJsonOrPath = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

      if (serviceAccountJsonOrPath) {
        let parsed: Record<string, string> | undefined;

        if (serviceAccountJsonOrPath.trim().startsWith('{')) {
          parsed = JSON.parse(serviceAccountJsonOrPath);
        } else {
          const serviceAccountPath = resolve(process.cwd(), serviceAccountJsonOrPath);
          if (existsSync(serviceAccountPath)) {
            parsed = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
          }
        }

        if (parsed) {
          const serviceAccount = {
            projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
            privateKey: parsed.private_key ? cleanPrivateKey(parsed.private_key) : undefined,
          };

          if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error('Missing Firebase Admin credentials');
          }

          return serviceAccount;
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

    initializeApp({
      credential: cert(getServiceAccount()),
    });
  } catch (error) {
    console.warn('Firebase Admin initialization skipped during build:', error);
  }
}

export const adminAuth = getAuth();
