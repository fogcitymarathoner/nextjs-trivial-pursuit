// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

const clearSessionCookie = (response: NextResponse) => {
  response.cookies.delete('session');
  return response;
};

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  return clearSessionCookie(response);
}

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    return clearSessionCookie(response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 },
    );
  }
}
