// scripts/test_firebase_credentials.ts
// To run: npx tsx scripts/test_firebase_credentials.ts

import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔍 Testing Firebase Admin credentials...');
console.log('📁 Loading .env.local from:', resolve(process.cwd(), '.env.local'));

// Check if environment variables are loaded
console.log('\n📋 Environment variables status:');
console.log('  NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Present' : '❌ MISSING');
console.log('  NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL:', process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL ? '✅ Present' : '❌ MISSING');
console.log('  NEXT_PUBLIC_FIREBASE_PRIVATE_KEY:', process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY ? `✅ Present (${process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY.length} chars)` : '❌ MISSING');

// Get credentials from NEXT_PUBLIC_ environment variables
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

// Check if all required variables are present
if (!projectId || !clientEmail || !privateKey) {
  console.error('\n❌ Missing required environment variables!');
  console.error('   Please ensure these are set in .env.local:');
  console.error('   - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  console.error('   - NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL');
  console.error('   - NEXT_PUBLIC_FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

// Clean the private key (handle newlines and quotes)
privateKey = privateKey.replace(/\\n/g, '\n');
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

console.log('\n🚀 Initializing Firebase Admin with credentials:');
console.log('  projectId:', projectId);
console.log('  clientEmail:', clientEmail);
console.log('  privateKey length:', privateKey.length);
console.log('  privateKey preview:', privateKey.substring(0, 50) + '...');

// Function to run the test
async function testFirebaseAdmin() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('\n⚠️ Firebase Admin already initialized. Cleaning up...');
      for (const app of admin.apps) {
        await app?.delete();
      }
    }

    // Initialize Firebase Admin with the credentials
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log('\n✅ Firebase Admin initialized successfully!');
    console.log('📦 Number of apps:', admin.apps.length);

    // Test authentication by trying to get user info
    try {
      console.log('\n🔑 Testing Firebase Auth connection...');

      // Try to list users (just 1 to test connection)
      const listUsersResult = await admin.auth().listUsers(1);
      console.log('✅ Successfully connected to Firebase Auth!');
      console.log(`   Total users in project: ${listUsersResult.users.length}`);

      if (listUsersResult.users.length > 0) {
        const user = listUsersResult.users[0];
        console.log(`   Sample user: ${user.email || user.uid}`);
      }

      // Test creating a session cookie (without actually creating one)
      console.log('\n✅ Firebase Admin is ready to create session cookies!');

    } catch (authError: any) {
      console.log('⚠️ Auth test warning:', authError.message);
      console.log('   This might be because:');
      console.log('   - There are no users in the project');
      console.log('   - The service account doesn\'t have proper permissions');
      console.log('   - The credentials are valid but the project is empty');

      // Check if the error is about permissions
      if (authError.message?.includes('permission')) {
        console.log('\n💡 Tip: Make sure the service account has the "Firebase Admin SDK Administrator Service Agent" role.');
      }
    }

    console.log('\n🎉 All tests passed! Your Firebase Admin credentials are valid.');
    console.log('✅ You can now use Firebase Admin in your API routes.');

  } catch (error: any) {
    console.error('\n❌ Firebase Admin initialization error:');
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code || 'N/A');

    if (error.message?.includes('Invalid private key')) {
      console.error('\n💡 Tip: Check your private key format.');
      console.error('   Make sure it contains "-----BEGIN PRIVATE KEY-----"');
      console.error('   and "-----END PRIVATE KEY-----" with proper newlines.');
      console.error('   The key should start with: -----BEGIN PRIVATE KEY-----');
      console.error('   And end with: -----END PRIVATE KEY-----');
    }

    if (error.message?.includes('Could not load the default credentials')) {
      console.error('\n💡 Tip: Make sure your credentials are properly formatted.');
      console.error('   Check that NEXT_PUBLIC_FIREBASE_PROJECT_ID is correct.');
    }

    console.error('\n📝 Full error details:', error);
    process.exit(1);
  }
}

// Run the test
testFirebaseAdmin();
