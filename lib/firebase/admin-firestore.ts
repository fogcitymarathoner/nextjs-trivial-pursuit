import '@/config/env.server';

import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { isFirebaseInitialized } from './admin';

export const getFirebaseAdminFirestore = () => {
  if (!isFirebaseInitialized()) {
    return null;
  }

  const app = getApps()[0];
  if (!app) {
    return null;
  }

  const databaseId = process.env.FIRESTORE_DATABASE_ID
    || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID
    || '(default)';

  return getFirestore(app, databaseId);
};
