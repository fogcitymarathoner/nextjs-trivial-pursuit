// app/api/auth/verify/__tests__/route.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../route';
import { adminAuth, getFirebaseAdminAuth, isFirebaseInitialized } from '@/lib/firebase/admin';

// Mock Firebase admin
jest.mock('@/lib/firebase/admin', () => {
    const adminAuth = {
        verifySessionCookie: jest.fn(),
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
    const mockResponse = {
        json: jest.fn().mockReturnThis(),
    };

    return {
        NextRequest: jest.fn().mockImplementation((url, options) => ({
            url: url || 'http://localhost:3000',
            cookies: {
                get: jest.fn().mockImplementation((name) => {
                    const cookie = options?.headers?.Cookie || '';
                    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
                    return match ? { value: match[1] } : undefined;
                }),
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

describe('Verify API Route - GET', () => {
    let mockRequest: NextRequest;
    const mockSessionCookie = 'mock-session-cookie-xyz';
    const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (isFirebaseInitialized as jest.Mock).mockReturnValue(true);
        (getFirebaseAdminAuth as jest.Mock).mockReturnValue(mockAdminAuth);
    });

    describe('Successful verification', () => {
        it('should verify session cookie and return user data', async () => {
            // Setup request with session cookie
            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            // Mock successful verification
            (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const response = await GET(mockRequest);

            // Verify mockAdminAuth.verifySessionCookie was called with correct params
            expect(mockAdminAuth.verifySessionCookie).toHaveBeenCalledWith(
                mockSessionCookie,
                true // checkRevoked
            );

            // Verify response
            expect(NextResponse.json).toHaveBeenCalledWith({
                authenticated: true,
                user: {
                    uid: mockDecodedToken.uid,
                    email: mockDecodedToken.email,
                    name: mockDecodedToken.name,
                    picture: mockDecodedToken.picture,
                }
            });
        });

        it('should handle user without optional fields', async () => {
            const minimalDecodedToken = {
                uid: 'user-456',
                email: 'minimal@example.com',
            };

            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(minimalDecodedToken);

            await GET(mockRequest);

            expect(NextResponse.json).toHaveBeenCalledWith({
                authenticated: true,
                user: {
                    uid: minimalDecodedToken.uid,
                    email: minimalDecodedToken.email,
                    name: undefined,
                    picture: undefined,
                }
            });
        });

        it('should handle user with null optional fields', async () => {
            const tokenWithNulls = {
                uid: 'user-789',
                email: 'null@example.com',
                name: null,
                picture: null,
            };

            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(tokenWithNulls);

            await GET(mockRequest);

            expect(NextResponse.json).toHaveBeenCalledWith({
                authenticated: true,
                user: {
                    uid: tokenWithNulls.uid,
                    email: tokenWithNulls.email,
                    name: null,
                    picture: null,
                }
            });
        });
    });

    describe('Error handling - No session', () => {
        it('should return 401 if no session cookie is present', async () => {
            // Request with no cookies
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify');

            const response = await GET(mockRequest);

            expect(isFirebaseInitialized).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith(
                { authenticated: false, error: 'No session found' },
                { status: 401 }
            );
            expect(mockAdminAuth.verifySessionCookie).not.toHaveBeenCalled();
        });

        it('should return 401 if session cookie value is empty', async () => {
            const requestOptions = {
                headers: {
                    Cookie: 'session=',
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            await GET(mockRequest);

            expect(isFirebaseInitialized).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith(
                { authenticated: false, error: 'No session found' },
                { status: 401 }
            );
            expect(mockAdminAuth.verifySessionCookie).not.toHaveBeenCalled();
        });
    });

    describe('Error handling - Invalid session', () => {
        it('should return 401 if session cookie is invalid', async () => {
            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            const errorMessage = 'Invalid session cookie';
            (mockAdminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await GET(mockRequest);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Verification error:',
                expect.any(Error)
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { authenticated: false, error: 'Invalid session' },
                { status: 401 }
            );

            consoleErrorSpy.mockRestore();
        });

        it('should return 401 if session cookie is revoked', async () => {
            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            const errorMessage = 'Session cookie has been revoked';
            (mockAdminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await GET(mockRequest);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Verification error:',
                expect.any(Error)
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { authenticated: false, error: 'Invalid session' },
                { status: 401 }
            );

            consoleErrorSpy.mockRestore();
        });

        it('should return 401 if session cookie is expired', async () => {
            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            const errorMessage = 'Session cookie has expired';
            (mockAdminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await GET(mockRequest);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Verification error:',
                expect.any(Error)
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { authenticated: false, error: 'Invalid session' },
                { status: 401 }
            );

            consoleErrorSpy.mockRestore();
        });

        it('should handle non-Error exceptions', async () => {
            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            (mockAdminAuth.verifySessionCookie as jest.Mock).mockRejectedValue('String error');

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await GET(mockRequest);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Verification error:',
                'String error'
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { authenticated: false, error: 'Invalid session' },
                { status: 401 }
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Cookie parsing', () => {
        it('should handle multiple cookies in request', async () => {
            const requestOptions = {
                headers: {
                    Cookie: `other=value; session=${mockSessionCookie}; another=test`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            await GET(mockRequest);

            expect(mockAdminAuth.verifySessionCookie).toHaveBeenCalledWith(
                mockSessionCookie,
                true
            );
        });

        it('should handle session cookie with special characters', async () => {
            const specialCookie = 'session=abc123!@#$%^&*()';
            const requestOptions = {
                headers: {
                    Cookie: specialCookie,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            // Extract the cookie value
            const cookieValue = requestOptions.headers.Cookie.split('=')[1];
            (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            await GET(mockRequest);

            expect(mockAdminAuth.verifySessionCookie).toHaveBeenCalledWith(
                cookieValue,
                true
            );
        });
    });

    describe('Response structure', () => {
        it('should return 200 status for authenticated requests', async () => {
            const requestOptions = {
                headers: {
                    Cookie: `session=${mockSessionCookie}`,
                },
            };
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify', requestOptions);

            (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const response = await GET(mockRequest);

            // Verify response includes authenticated: true
            expect(response.body).toEqual({
                authenticated: true,
                user: {
                    uid: mockDecodedToken.uid,
                    email: mockDecodedToken.email,
                    name: mockDecodedToken.name,
                    picture: mockDecodedToken.picture,
                }
            });
        });

        it('should return 401 status for unauthenticated requests', async () => {
            mockRequest = new NextRequest('http://localhost:3000/api/auth/verify');

            const response = await GET(mockRequest);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                authenticated: false,
                error: 'No session found'
            });
        });
    });
});
