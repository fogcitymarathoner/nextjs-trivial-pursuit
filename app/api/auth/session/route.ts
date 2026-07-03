// app/api/auth/session/route.ts
/*
This file is the bridge between Firebase authentication and your Next.js app's session management. It:

    Takes a Firebase ID token

    Verifies it

    Creates a secure session cookie

    Makes the user authenticated for future requests

This is the standard pattern for using Firebase Auth with Next.js App Router,
allowing you to use server-side authentication and protect routes with middleware.

 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, isFirebaseInitialized } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is initialized
    if (!isFirebaseInitialized() || !adminAuth) {
      console.error('Firebase Admin is not initialized. Check your credentials.');
      return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
      );
    }

    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
          { error: 'ID token is required' },
          { status: 400 },
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({
      success: true,
      message: 'Session created successfully',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
      },
    });

    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create session';

    return NextResponse.json(
        { error: message },
        { status: 500 },
    );
  }
}