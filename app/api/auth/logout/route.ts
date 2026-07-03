// app/api/auth/logout/route.ts
/*
This file is the logout endpoint for your application. It:

    Deletes the authentication session cookie

    Effectively logs the user out

    Provides both GET (redirect) and POST (JSON) methods

    Works with your NavBar's logout button

    Works with your proxy middleware to protect routes

The POST method is what your NavBar component calls when a user clicks the "Logout" button,
making it the primary logout method in your application.
 */
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
