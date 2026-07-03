// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/signup', '/'];

const isPublicPath = (path: string) => {
  return publicPaths.includes(path) ||
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/api/auth');
};

const isAuthenticatedRequest = async (request: NextRequest) => {
  if (!request.cookies.get('session')?.value) {
    return false;
  }

  try {
    const verifyUrl = new URL('/api/auth/verify', request.url);
    const response = await fetch(verifyUrl, {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });

    return response.ok;
  } catch (error) {
    console.error('Middleware session verification error:', error);
    return false;
  }
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const authenticated = await isAuthenticatedRequest(request);

  if (!authenticated && !isPublicPath(path)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
