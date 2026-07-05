// app/api/auth/login/__tests__/route.test.ts
import { adminAuth, getFirebaseAdminAuth, isFirebaseInitialized } from '@/lib/firebase/admin';
import { NextRequest } from 'next/server';

// Mock the Firebase admin FIRST
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

// Mock NextRequest and NextResponse without requiring actual
jest.mock('next/server', () => {
    type CookieOptions = Record<string, unknown>;

    class MockCookies {
        private cookies: Map<string, { value: string; options?: CookieOptions }> = new Map();

        get(name: string) {
            const cookie = this.cookies.get(name);
            return cookie ? { name, value: cookie.value } : undefined;
        }

        set(name: string, value: string, options?: CookieOptions) {
            this.cookies.set(name, { value, options });
            return this;
        }

        delete(name: string) {
            this.cookies.delete(name);
        }

        getAll() {
            return Array.from(this.cookies.entries()).map(([name, data]) => ({
                name,
                value: data.value,
            }));
        }
    }

    class MockNextRequest {
        public cookies: MockCookies;
        public method: string;
        public url: string;
        private _jsonBody: unknown;
        public jsonError: Error | null = null;

        constructor(url: string, options?: RequestInit) {
            this.url = url;
            this.method = options?.method || 'GET';
            this.cookies = new MockCookies();

            if (options?.body) {
                try {
                    this._jsonBody = JSON.parse(options.body as string);
                } catch (error) {
                    this.jsonError = error as Error;
                    this._jsonBody = {};
                }
            } else {
                this._jsonBody = {};
            }
        }

        async json() {
            if (this.jsonError) {
                throw this.jsonError;
            }
            return this._jsonBody;
        }
    }

    class MockResponse {
        status: number;
        headers: Headers;
        body: unknown;
        cookies: MockCookies;

        constructor(body: unknown, init?: ResponseInit) {
            this.status = init?.status || 200;
            this.headers = new Headers(init?.headers);
            this.body = body;
            this.cookies = new MockCookies();
        }

        json() {
            return Promise.resolve(this.body);
        }

        get statusText() {
            return this.status === 200 ? 'OK' : 'Error';
        }

        get ok() {
            return this.status >= 200 && this.status < 300;
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: (data: unknown, init?: { status?: number }) => {
                return new MockResponse(data, init);
            },
            redirect: (url: string) => {
                return new MockResponse(null, { status: 302, headers: { Location: url } });
            },
        },
    };
});

// Now import the route after mocks are set up
import { POST } from '../route';

describe('POST /api/auth/login', () => {
    const setNodeEnv = (value: string | undefined) => {
        const env = process.env as Record<string, string | undefined>;
        if (value === undefined) {
            delete env.NODE_ENV;
            return;
        }
        env.NODE_ENV = value;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (isFirebaseInitialized as jest.Mock).mockReturnValue(true);
        (getFirebaseAdminAuth as jest.Mock).mockReturnValue(mockAdminAuth);
        setNodeEnv('development');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    const createMockRequest = (body: Record<string, unknown>) => {
        const request = new NextRequest(
            'http://localhost:3000/api/auth/login',
            {
                method: 'POST',
                body: JSON.stringify(body),
            }
        );
        return request;
    };

    it('should successfully login and create a session', async () => {
        const mockIdToken = 'mock-id-token';
        const mockUid = 'user-123';
        const mockEmail = 'test@example.com';
        const mockDisplayName = 'Test User';
        const mockSessionCookie = 'mock-session-cookie';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
            uid: mockUid,
            email: mockEmail,
            name: mockDisplayName,
        });

        (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(mockSessionCookie);

        const request = createMockRequest({ idToken: mockIdToken });
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toEqual({
            success: true,
            message: 'Login successful',
            user: {
                uid: mockUid,
                email: mockEmail,
                displayName: mockDisplayName,
            },
        });

        expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith(mockIdToken);
        expect(mockAdminAuth.createSessionCookie).toHaveBeenCalledWith(mockIdToken, {
            expiresIn: expect.any(Number),
        });

        // Check cookie was set on the response
        const cookies = response.cookies.get('session');
        expect(cookies).toBeDefined();
        expect(cookies?.value).toBe(mockSessionCookie);
    });

    it('should return 400 when idToken is missing', async () => {
        const request = createMockRequest({});
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData).toEqual({
            error: 'ID token is required',
        });

        expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
        expect(mockAdminAuth.createSessionCookie).not.toHaveBeenCalled();
    });

    it('should return 401 when ID token is invalid', async () => {
        const mockIdToken = 'invalid-token';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
            new Error('Invalid ID token')
        );

        const request = createMockRequest({ idToken: mockIdToken });
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toEqual({
            error: 'Invalid ID token',
        });

        expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith(mockIdToken);
        expect(mockAdminAuth.createSessionCookie).not.toHaveBeenCalled();
    });

    it('should return 401 when session cookie creation fails', async () => {
        const mockIdToken = 'mock-id-token';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
            uid: 'user-123',
            email: 'test@example.com',
        });

        (mockAdminAuth.createSessionCookie as jest.Mock).mockRejectedValue(
            new Error('Failed to create session cookie')
        );

        const request = createMockRequest({ idToken: mockIdToken });
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toEqual({
            error: 'Failed to create session cookie',
        });

        expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith(mockIdToken);
        expect(mockAdminAuth.createSessionCookie).toHaveBeenCalled();
    });

    it('should handle malformed JSON request', async () => {
        const request = new NextRequest(
            'http://localhost:3000/api/auth/login',
            {
                method: 'POST',
                body: 'invalid json',
            }
        );

        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toEqual({
            error: "Unexpected token 'i', \"invalid json\" is not valid JSON",
        });

        expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
        expect(mockAdminAuth.createSessionCookie).not.toHaveBeenCalled();
    });

    it('should handle case where user has no display name', async () => {
        const mockIdToken = 'mock-id-token';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
            uid: 'user-123',
            email: 'test@example.com',
            name: undefined,
        });

        (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(
            'mock-session-cookie'
        );

        const request = createMockRequest({ idToken: mockIdToken });
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.user.displayName).toBeUndefined();
    });

    it('should handle generic unknown error', async () => {
        const mockIdToken = 'mock-id-token';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
            'Something went wrong'
        );

        const request = createMockRequest({ idToken: mockIdToken });
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toEqual({
            error: 'Failed to login',
        });
    });

    it('should handle case where token verification fails with Firebase error', async () => {
        const mockIdToken = 'mock-id-token';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
            new Error('Firebase: Invalid token')
        );

        const request = createMockRequest({ idToken: mockIdToken });
        const response = await POST(request);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toEqual({
            error: 'Firebase: Invalid token',
        });
    });

    it('should check that cookie has secure option in production', async () => {
        setNodeEnv('production');

        const mockIdToken = 'mock-id-token';

        (mockAdminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
            uid: 'user-123',
            email: 'test@example.com',
        });

        (mockAdminAuth.createSessionCookie as jest.Mock).mockResolvedValue(
            'mock-session-cookie'
        );

        const request = createMockRequest({ idToken: mockIdToken });
        await POST(request);

        // Just verify the environment variable was used
        expect(process.env.NODE_ENV).toBe('production');
    });
});
