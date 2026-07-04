// proxy.ts
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/signup', '/'];

const isPublicPath = (path: string) => {
  return publicPaths.includes(path) ||
      path.startsWith('/about') ||
      path.startsWith('/marc') ||
      path.startsWith('/exp') ||
      path.startsWith('/exp2') ||
      path.startsWith('/exp3') ||
      path.startsWith('/_next') ||
      path.startsWith('/static') ||
      path.startsWith('/api/auth');
};

const isAuthenticatedRequest = (request: NextRequest) => {
  return Boolean(request.cookies.get('session')?.value);
};

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const authenticated = isAuthenticatedRequest(request);

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
