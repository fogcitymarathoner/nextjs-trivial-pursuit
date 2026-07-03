// app/api/auth/logout/__tests__/route.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../route';

// Mock NextResponse and NextRequest
jest.mock('next/server', () => {
    const mockCookieDelete = jest.fn();
    const mockResponse = {
        cookies: {
            delete: mockCookieDelete,
        },
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
    };

    return {
        NextRequest: jest.fn().mockImplementation(() => ({
            url: 'http://localhost:3000',
            cookies: {
                get: jest.fn(),
                delete: jest.fn(),
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
            redirect: jest.fn().mockImplementation((url, init) => ({
                ...mockResponse,
                url: typeof url === 'string' ? url : url.toString(),
                status: init?.status || 307,
                headers: new Headers(),
            })),
        },
    };
});

describe('Logout API Route', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = new NextRequest('http://localhost:3000');
    });

    describe('GET /logout', () => {
        it('should redirect to /login and clear session cookie', async () => {
            const response = await GET(mockRequest);

            // Verify redirect was called with a URL object (route uses `new URL('/login', request.url)`)
            expect(NextResponse.redirect).toHaveBeenCalledWith(
                expect.any(URL)
            );

            const calledUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
            expect(calledUrl.toString()).toBe('http://localhost:3000/login');

            // Verify cookie was deleted
            expect(response.cookies.delete).toHaveBeenCalledWith('session');

            // Verify response structure
            expect(response).toHaveProperty('url');
            expect(response.url).toBe('http://localhost:3000/login');
        });

        it('should redirect to login with custom status if provided', async () => {
            const mockResponse = {
                cookies: {
                    delete: jest.fn(),
                },
                status: 302,
            };
            (NextResponse.redirect as jest.Mock).mockReturnValueOnce(mockResponse);

            const response = await GET(mockRequest);

            expect(NextResponse.redirect).toHaveBeenCalled();
            expect(response.cookies.delete).toHaveBeenCalledWith('session');
        });
    });

    describe('POST /logout', () => {
        it('should return success response and clear session cookie', async () => {
            const response = await POST();

            // Verify JSON response
            expect(NextResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logged out successfully',
            });

            // Verify cookie was deleted
            expect(response.cookies.delete).toHaveBeenCalledWith('session');

            // Verify response body
            expect(response.body).toEqual({
                success: true,
                message: 'Logged out successfully',
            });
        });

        it('should return success response with status 200', async () => {
            const response = await POST();

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Logged out successfully',
            });
        });

        it('should handle errors gracefully', async () => {
            // Mock console.error to prevent test output noise
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Force an error by making NextResponse.json throw
            (NextResponse.json as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Something went wrong');
            });

            await POST();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Logout error:',
                expect.any(Error)
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Failed to logout' },
                { status: 500 }
            );

            consoleErrorSpy.mockRestore();
        });

        it('should handle non-Error exceptions', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Simulate throwing a string instead of Error
            (NextResponse.json as jest.Mock).mockImplementationOnce(() => {
                throw 'Something went wrong';
            });

            await POST();

            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Integration - Cookie clearing', () => {
        it('should call cookies.delete with correct cookie name for both GET and POST', async () => {
            const getResponse = await GET(mockRequest);
            expect(getResponse.cookies.delete).toHaveBeenCalledWith('session');

            jest.clearAllMocks();
            const postResponse = await POST();
            expect(postResponse.cookies.delete).toHaveBeenCalledWith('session');
        });

        it('should not throw error if session cookie is not present', async () => {
            // The route creates a new response with cookies.delete
            // So we just verify the response is defined and cookie deletion was called
            const response = await GET(mockRequest);

            // Verify cookie deletion was called on the response
            expect(response.cookies.delete).toHaveBeenCalledWith('session');
            expect(response).toBeDefined();
        });
    });
});