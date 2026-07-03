import { cookies } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '@/lib/firebase/admin';

export type AuthTokens = {
  token: string;
  decodedToken: DecodedIdToken;
};

export async function getAuthTokens(): Promise<AuthTokens | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      token: sessionCookie,
      decodedToken,
    };
  } catch (error) {
    console.error('Error verifying Firebase session cookie:', error);
    return null;
  }
}
