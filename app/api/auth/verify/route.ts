// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, isFirebaseInitialized } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
          { authenticated: false, error: 'No session found' },
          { status: 401 }
      );
    }

    // Check if Firebase is initialized
    if (!isFirebaseInitialized() || !adminAuth) {
      console.error('Firebase Admin is not initialized. Check your credentials.');
      return NextResponse.json(
          { authenticated: false, error: 'Server configuration error' },
          { status: 500 }
      );
    }

    try {
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
      return NextResponse.json({
        authenticated: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture,
        },
      });
    } catch (error) {
      console.error('Verification error:', error);
      return NextResponse.json(
          { authenticated: false, error: 'Invalid session' },
          { status: 401 }
      );
    }
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
        { authenticated: false, error: 'Verification failed' },
        { status: 500 }
    );
  }
}
