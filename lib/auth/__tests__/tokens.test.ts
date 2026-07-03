// lib/auth/__tests__/tokens.test.ts
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { getAuthTokens, type AuthTokens } from '../tokens';

// Mock next/headers
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

// Mock firebase admin
jest.mock('@/lib/firebase/admin', () => ({
    adminAuth: {
        verifySessionCookie: jest.fn(),
    },
}));

describe('getAuthTokens', () => {
    const mockSessionCookie = 'mock-session-cookie-xyz';
    const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        iss: 'https://securetoken.google.com/test-project',
        aud: 'test-project',
        auth_time: 1234567890,
        user_id: 'user-123',
        sub: 'user-123',
        iat: 1234567890,
        exp: 1234567890,
        firebase: {
            identities: {
                email: ['test@example.com'],
            },
            sign_in_provider: 'google.com',
        },
    };

    let mockCookieStore: {
        get: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockCookieStore = {
            get: jest.fn(),
        };
        (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
    });

    describe('Successful token retrieval', () => {
        it('should return auth tokens when session cookie exists and is valid', async () => {
            // Mock cookie exists
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });

            // Mock successful verification
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const result = await getAuthTokens();

            expect(result).toEqual({
                token: mockSessionCookie,
                decodedToken: mockDecodedToken,
            });
            expect(cookies).toHaveBeenCalled();
            expect(mockCookieStore.get).toHaveBeenCalledWith('session');
            expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith(
                mockSessionCookie,
                true // checkRevoked
            );
        });

        it('should handle decoded token with minimal fields', async () => {
            const minimalDecodedToken = {
                uid: 'user-456',
                email: 'minimal@example.com',
                email_verified: false,
                iss: 'https://securetoken.google.com/test-project',
                aud: 'test-project',
                auth_time: 1234567890,
                user_id: 'user-456',
                sub: 'user-456',
                iat: 1234567890,
                exp: 1234567890,
                firebase: {
                    identities: {
                        email: ['minimal@example.com'],
                    },
                    sign_in_provider: 'password',
                },
            };

            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(minimalDecodedToken);

            const result = await getAuthTokens();

            expect(result).toEqual({
                token: mockSessionCookie,
                decodedToken: minimalDecodedToken,
            });
        });

        it('should handle token with additional custom claims', async () => {
            const tokenWithClaims = {
                ...mockDecodedToken,
                admin: true,
                premium: true,
                custom_claim: 'custom-value',
            };

            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(tokenWithClaims);

            const result = await getAuthTokens();

            expect(result).toEqual({
                token: mockSessionCookie,
                decodedToken: tokenWithClaims,
            });
            expect((result as AuthTokens).decodedToken).toHaveProperty('admin', true);
            expect((result as AuthTokens).decodedToken).toHaveProperty('premium', true);
        });
    });

    describe('No session cookie', () => {
        it('should return null when session cookie does not exist', async () => {
            // Mock no cookie
            mockCookieStore.get.mockReturnValue(undefined);

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(cookies).toHaveBeenCalled();
            expect(mockCookieStore.get).toHaveBeenCalledWith('session');
            expect(adminAuth.verifySessionCookie).not.toHaveBeenCalled();
        });

        it('should return null when session cookie value is empty string', async () => {
            mockCookieStore.get.mockReturnValue({ value: '' });

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(mockCookieStore.get).toHaveBeenCalledWith('session');
            expect(adminAuth.verifySessionCookie).not.toHaveBeenCalled();
        });

        it('should return null when session cookie value is null', async () => {
            mockCookieStore.get.mockReturnValue({ value: null });

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(mockCookieStore.get).toHaveBeenCalledWith('session');
            expect(adminAuth.verifySessionCookie).not.toHaveBeenCalled();
        });
    });

    describe('Invalid session cookie', () => {
        it('should return null when session cookie verification fails', async () => {
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });

            const errorMessage = 'Invalid session cookie';
            (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith(
                mockSessionCookie,
                true
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error verifying Firebase session cookie:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should return null when session cookie is revoked', async () => {
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });

            const errorMessage = 'Session cookie has been revoked';
            (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith(
                mockSessionCookie,
                true
            );
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should return null when session cookie is expired', async () => {
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });

            const errorMessage = 'Session cookie has expired';
            (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                new Error(errorMessage)
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith(
                mockSessionCookie,
                true
            );
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should handle non-Error exceptions', async () => {
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });

            (adminAuth.verifySessionCookie as jest.Mock).mockRejectedValue(
                'String error'
            );

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await getAuthTokens();

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error verifying Firebase session cookie:',
                'String error'
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Edge cases', () => {
        it('should handle cookies with special characters', async () => {
            const specialCookie = 'session=abc123!@#$%^&*()';
            mockCookieStore.get.mockReturnValue({ value: specialCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const result = await getAuthTokens();

            expect(result).toEqual({
                token: specialCookie,
                decodedToken: mockDecodedToken,
            });
            expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith(
                specialCookie,
                true
            );
        });

        it('should handle long session cookie values', async () => {
            const longCookie = 'a'.repeat(1000);
            mockCookieStore.get.mockReturnValue({ value: longCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const result = await getAuthTokens();

            expect(result).toEqual({
                token: longCookie,
                decodedToken: mockDecodedToken,
            });
            expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith(
                longCookie,
                true
            );
        });

        it('should handle undefined decodedToken fields gracefully', async () => {
            const tokenWithUndefinedFields = {
                uid: 'user-123',
                email: undefined,
                email_verified: false,
                iss: 'https://securetoken.google.com/test-project',
                aud: 'test-project',
                auth_time: 1234567890,
                user_id: 'user-123',
                sub: 'user-123',
                iat: 1234567890,
                exp: 1234567890,
                firebase: {
                    identities: {},
                    sign_in_provider: 'google.com',
                },
            };

            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(tokenWithUndefinedFields);

            const result = await getAuthTokens();

            expect(result).toEqual({
                token: mockSessionCookie,
                decodedToken: tokenWithUndefinedFields,
            });
            expect((result as AuthTokens).decodedToken.email).toBeUndefined();
        });
    });

    describe('Integration with cookie store', () => {
        it('should handle cookies() returning a Promise', async () => {
            // cookies() is already mocked to return a Promise
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const result = await getAuthTokens();

            expect(result).toBeDefined();
            expect(cookies).toHaveBeenCalled();
        });

        it('should handle cookie store with multiple cookies', async () => {
            mockCookieStore.get.mockImplementation((name: string) => {
                if (name === 'session') {
                    return { value: mockSessionCookie };
                }
                return undefined;
            });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const result = await getAuthTokens();

            expect(result).toBeDefined();
            expect(mockCookieStore.get).toHaveBeenCalledWith('session');
        });
    });

    describe('Return type', () => {
        it('should return AuthTokens when authenticated', async () => {
            mockCookieStore.get.mockReturnValue({ value: mockSessionCookie });
            (adminAuth.verifySessionCookie as jest.Mock).mockResolvedValue(mockDecodedToken);

            const result = await getAuthTokens();

            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('decodedToken');
            expect(typeof (result as AuthTokens).token).toBe('string');
            expect((result as AuthTokens).decodedToken).toHaveProperty('uid');
        });

        it('should return null when not authenticated', async () => {
            mockCookieStore.get.mockReturnValue(undefined);

            const result = await getAuthTokens();

            expect(result).toBeNull();
        });
    });
});