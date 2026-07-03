// app/api/auth/login/route.ts
/*
This file is the primary login endpoint for your application. It:

    Takes a Firebase ID token

    Verifies it with Firebase Admin SDK

    Creates a secure 5-day session cookie

    Logs the user in for all future requests

The session cookie created here is what your proxy.ts middleware checks to determine
if a user is authenticated and can access protected routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json(
                { error: 'ID token is required' },
                { status: 400 }
            );
        }

        // Verify the ID token
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Create session cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name,
            },
        });

        // Set the session cookie
        response.cookies.set('session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        const message = error instanceof Error ? error.message : 'Failed to login';

        return NextResponse.json(
            { error: message },
            { status: 401 }
        );
    }
}