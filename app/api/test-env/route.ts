// app/api/test-env/route.ts
// firebase diagnostic
import { NextResponse } from 'next/server';

import { NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY
} from '@/config/env.client';
import {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY
} from '@/config/env.server';
export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅' : '❌',
    FIREBASE_CLIENT_EMAIL: FIREBASE_CLIENT_EMAIL ? '✅' : '❌',
    FIREBASE_PRIVATE_KEY: FIREBASE_PRIVATE_KEY ? '✅' : '❌',
    NEXT_PUBLIC_FIREBASE_API_KEY: NEXT_PUBLIC_FIREBASE_API_KEY ? '✅' : '❌',
    COOKIE_SIGNATURE_KEY: process.env.COOKIE_SIGNATURE_KEY ? `✅ (${process.env.COOKIE_SIGNATURE_KEY.length} chars)` : '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envCheck);
}