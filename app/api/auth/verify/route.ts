// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, error: 'No session found' },
        { status: 401 }
      );
    }

    // Verify the session cookie
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      authenticated: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Invalid session' },
      { status: 401 }
    );
  }
}
