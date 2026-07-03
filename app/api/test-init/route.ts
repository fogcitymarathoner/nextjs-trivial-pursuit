// app/api/test-init/route.ts
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  const isInitialized = admin.apps.length > 0;

  const envCheck = {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅' : '❌',
    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL ? '✅' : '❌',
    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY ? '✅' : '❌',
  };

  return NextResponse.json({
    initialized: isInitialized,
    appsCount: admin.apps.length,
    envCheck: envCheck,
    nodeEnv: process.env.NODE_ENV
  });
}