// lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { firebaseConfig, firestoreDatabaseId } from './config';

console.log('🔧 Firebase Client Config:', {
  apiKey: firebaseConfig.apiKey ? '✅' : '❌',
  authDomain: firebaseConfig.authDomain ? '✅' : '❌',
  projectId: firebaseConfig.projectId ? '✅' : '❌',
  storageBucket: firebaseConfig.storageBucket ? '✅' : '❌',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅' : '❌',
  appId: firebaseConfig.appId ? '✅' : '❌',
});

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Missing required Firebase configuration!');
  throw new Error('Firebase configuration is incomplete');
}

// Initialize the browser SDK once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
console.log('✅ Firebase app initialized:', app.name);

// Initialize Firestore with settings
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firestoreDatabaseId);
console.log('✅ Firestore initialized');

let auth: Auth | undefined;

const getFirebaseAuth = () => {
  if (!auth) {
    auth = getAuth(app);
    console.log('✅ Firebase Auth initialized');
  }
  return auth;
};

export { app, db, getFirebaseAuth };
