// app/api/auth/session/__tests__/route.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';
import { adminAuth, getFirebaseAdminAuth, isFirebaseInitialized } from '@/lib/firebase/admin';

// Mock Firebase admin
jest.mock('@/lib/firebase/admin', () => {
    const adminAuth = {
        verifyIdToken: jest.fn(),
        createSessionCookie: jest.fn(),
    };

    return {
        adminAuth,
        getFirebaseAdminAuth: jest.fn(() => adminAuth),
        isFirebaseInitialized: jest.fn(() => true),
    };
});

const mockAdminAuth = adminAuth as NonNullable<typeof adminAuth>;

// Mock NextResponse and NextRequest
jest.mock('next/server', () => {
    const mockCookieSet = jest.fn();
    const mockResponse = {
        cookies: {
            set: mockCookieSet,
        },
        json: jest.fn().mockReturnThis(),
    };

    return {
        NextRequest: jest.fn().mockImplementation((url, options) => ({
            url: url || 'http://localhost:3000',
            json: jest.fn().mockImplementation(() => {
                const body = options?.body ? JSON.parse(options.body) : {};
                return Promise.resolve(body);
            }),
            cookies: {
                get: jest.fn(),
                set: jest.fn(),
            },
        })),
        NextResponse: {
            json: jest.fn().mockImplementation((body, init) => ({
                ...mockResponse,
                body,
                status: init?.status || 200,
                statusText: init?.statusText || 'OK',
                headers: new Headers(),
            })),
        },
    };
});

describe('Session API Route - POST', () => {
    let mockRequest: NextRequest;
    const mockIdToken = 'mock-id-token-123';
    const mockSessionCookie = 'mock-session-cookie-xyz';
    const mockDecodedToken = {
        uid: 'mock-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
    };
    const setNodeEnv = (value: string | undefined) => {
        (process.env as Record<string, string | undefined>).NODE_ENV = value;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (isFirebaseInitialized as jest.Mock).mockReturnValue(true);
        (getFirebaseAdminAuth as jest.Mock).mockReturnValue(mockAdminAuth);

        // Setup request with idToken
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: mockIdToken }),
        };
        mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);
        (mockAdminAuth.verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
    });

    describe('Successful session creation', () => {
        it('should create a session cookie and return success response', async () => {
            // Mock successful session cookie creation
            (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(mockSessionCookie);

            const response = await POST(mockRequest);

            expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith(mockIdToken);

            // Verify mockAdminAuth.createSessionCookie was called with correct params
            expect(mockAdminAuth.createSessionCookie).toHaveBeenCalledWith(
                mockIdToken,
                { expiresIn: 60 * 60 * 24 * 5 * 1000 }
            );

            // Verify response
            expect(NextResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Session created successfully',
                user: {
                    uid: mockDecodedToken.uid,
                    email: mockDecodedToken.email,
                    displayName: mockDecodedToken.name,
                    photoURL: mockDecodedToken.picture,
                },
            });

            // Verify cookie was set
            expect(response.cookies.set).toHaveBeenCalledWith(
                'session',
                mockSessionCookie,
                {
                    maxAge: 60 * 60 * 24 * 5, // 5 days in seconds
                    httpOnly: true,
                    secure: false, // NODE_ENV is 'test' by default
                    sameSite: 'lax',
                    path: '/',
                }
            );
        });

        it('should set secure cookie to true in production', async () => {
            // Save original NODE_ENV
            const originalNodeEnv = process.env.NODE_ENV;
            setNodeEnv('production');

            (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(mockSessionCookie);

            const response = await POST(mockRequest);

            expect(response.cookies.set).toHaveBeenCalledWith(
                'session',
                mockSessionCookie,
                expect.objectContaining({
                    secure: true,
                })
            );

            // Restore NODE_ENV
            setNodeEnv(originalNodeEnv);
        });

        it('should handle different idToken formats', async () => {
            const customToken = 'custom-token-456';
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken: customToken }),
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);

            (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue('cookie-for-custom-token');

            await POST(mockRequest);

            expect(mockAdminAuth.createSessionCookie).toHaveBeenCalledWith(
                customToken,
                expect.any(Object)
            );
        });
    });

    describe('Error handling', () => {
        it('should return 400 if idToken is missing', async () => {
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}), // Empty body
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);

            await POST(mockRequest);

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'ID token is required' },
                { status: 400 }
            );
            expect(mockAdminAuth.createSessionCookie).not.toHaveBeenCalled();
        });

        it('should return 400 if idToken is null', async () => {
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken: null }),
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);

            await POST(mockRequest);

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'ID token is required' },
                { status: 400 }
            );
            expect(mockAdminAuth.createSessionCookie).not.toHaveBeenCalled();
        });

        it('should return 400 if idToken is empty string', async () => {
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken: '' }),
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);

            await POST(mockRequest);

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'ID token is required' },
                { status: 400 }
            );
            expect(mockAdminAuth.createSessionCookie).not.toHaveBeenCalled();
        });

        it('should handle invalid JSON body', async () => {
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: 'invalid-json',
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);

            // Mock the json() method to throw an error with 'Invalid JSON' message
            (mockRequest.json as jest.Mock).mockRejectedValueOnce(new Error('Invalid JSON'));

            await POST(mockRequest);

            // The route returns the error message from the caught error
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Invalid JSON' },
                { status: 500 }
            );
        });

        it('should handle Firebase auth errors', async () => {
            const errorMessage = 'Firebase: Invalid ID token';
            (mockAdminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await POST(mockRequest);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Session creation error:',
                expect.any(Error)
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: errorMessage },
                { status: 500 }
            );

            consoleErrorSpy.mockRestore();
        });

        it('should handle non-Error exceptions', async () => {
            (mockAdminAuth.createSessionCookie as jest.Mock).mockRejectedValue('String error');

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await POST(mockRequest);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Session creation error:',
                'String error'
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Failed to create session' },
                { status: 500 }
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Cookie configuration', () => {
        it('should set correct cookie options for development', async () => {
            setNodeEnv('development');

            (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(mockSessionCookie);

            const response = await POST(mockRequest);

            expect(response.cookies.set).toHaveBeenCalledWith(
                'session',
                mockSessionCookie,
                expect.objectContaining({
                    maxAge: 60 * 60 * 24 * 5,
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    path: '/',
                })
            );
        });

        it('should set secure cookie options for production', async () => {
            setNodeEnv('production');

            (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(mockSessionCookie);

            const response = await POST(mockRequest);

            expect(response.cookies.set).toHaveBeenCalledWith(
                'session',
                mockSessionCookie,
                expect.objectContaining({
                    maxAge: 60 * 60 * 24 * 5,
                    httpOnly: true,
                    secure: true,
                    sameSite: 'lax',
                    path: '/',
                })
            );
        });

        it('should set correct maxAge based on expiresIn', async () => {
            (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(mockSessionCookie);

            const response = await POST(mockRequest);

            // Verify the cookie maxAge matches the expiresIn value in seconds
            expect(response.cookies.set).toHaveBeenCalledWith(
                'session',
                mockSessionCookie,
                expect.objectContaining({
                    maxAge: 432000, // 5 days in seconds (60 * 60 * 24 * 5)
                })
            );
        });
    });

    describe('Request parsing', () => {
        it('should handle missing body gracefully', async () => {
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/session', requestOptions);

            // Mock json to return empty object
            (mockRequest.json as jest.Mock).mockResolvedValueOnce({});

            await POST(mockRequest);

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'ID token is required' },
                { status: 400 }
            );
        });
    });
});
