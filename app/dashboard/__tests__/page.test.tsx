// app/dashboard/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../page';
import { getAuthTokens } from '@/lib/auth/tokens';
import { redirect } from 'next/navigation';

// Mock the auth tokens module
jest.mock('@/lib/auth/tokens', () => ({
    getAuthTokens: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));

describe('DashboardPage', () => {
    const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
    };

    const mockTokens = {
        decodedToken: mockDecodedToken,
        sessionCookie: 'mock-session-cookie',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should render dashboard when user is authenticated', async () => {
            // Mock authenticated user
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            render(await DashboardPage());

            // Wait for the component to render
            await waitFor(() => {
                expect(screen.getByText('Welcome to your Dashboard!')).toBeInTheDocument();
            });

            // Check user email is displayed
            expect(screen.getByText('test@example.com')).toBeInTheDocument();

            // Check user ID is displayed
            expect(screen.getByText('user-123')).toBeInTheDocument();

            // Check email verification status
            expect(screen.getByText('✅ Yes')).toBeInTheDocument();
        });

        it('should display user email when available', async () => {
            const userWithEmail = {
                decodedToken: {
                    ...mockDecodedToken,
                    email: 'user@example.com',
                },
                sessionCookie: 'mock-session-cookie',
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(userWithEmail);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getByText('user@example.com')).toBeInTheDocument();
            });
        });

        it('should display UID when email is not available', async () => {
            const userWithoutEmail = {
                decodedToken: {
                    ...mockDecodedToken,
                    email: null,
                },
                sessionCookie: 'mock-session-cookie',
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(userWithoutEmail);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getAllByText('user-123')).toHaveLength(2);
            });
        });

        it('should redirect to login when user is not authenticated', async () => {
            // Mock unauthenticated user
            (getAuthTokens as jest.Mock).mockResolvedValue(null);

            render(await DashboardPage());

            await waitFor(() => {
                expect(redirect).toHaveBeenCalledWith('/login');
            });
        });

        it('should redirect to login when tokens are empty', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue({});

            render(await DashboardPage());

            await waitFor(() => {
                expect(redirect).toHaveBeenCalledWith('/login');
            });
        });

        it('should redirect to login when tokens is undefined', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(undefined);

            render(await DashboardPage());

            await waitFor(() => {
                expect(redirect).toHaveBeenCalledWith('/login');
            });
        });

        it('should redirect to login when decodedToken is null', async () => {
            const invalidTokens = {
                decodedToken: null,
                sessionCookie: 'mock-session-cookie',
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(invalidTokens);

            render(await DashboardPage());

            await waitFor(() => {
                expect(redirect).toHaveBeenCalledWith('/login');
            });
        });

        it('should redirect to login when decodedToken is missing', async () => {
            const invalidTokens = {
                sessionCookie: 'mock-session-cookie',
                // decodedToken is intentionally omitted
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(invalidTokens);

            render(await DashboardPage());

            await waitFor(() => {
                expect(redirect).toHaveBeenCalledWith('/login');
            });
        });
    });

    describe('User information display', () => {
        it('should display "Signed in as" label', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getByText('Signed in as:')).toBeInTheDocument();
            });
        });

        it('should display "User ID" label', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getByText('User ID:')).toBeInTheDocument();
            });
        });

        it('should display "Email verified" label', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getByText('Email verified:')).toBeInTheDocument();
            });
        });

        it('should show ✅ when email is verified', async () => {
            const verifiedToken = {
                decodedToken: {
                    ...mockDecodedToken,
                    email_verified: true,
                },
                sessionCookie: 'mock-session-cookie',
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(verifiedToken);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getByText('✅ Yes')).toBeInTheDocument();
            });
        });

        it('should show ❌ when email is not verified', async () => {
            const unverifiedToken = {
                decodedToken: {
                    ...mockDecodedToken,
                    email_verified: false,
                },
                sessionCookie: 'mock-session-cookie',
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(unverifiedToken);

            render(await DashboardPage());

            await waitFor(() => {
                expect(screen.getByText('❌ No')).toBeInTheDocument();
            });
        });

        it('should display user ID in monospace font', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            render(await DashboardPage());

            await waitFor(() => {
                const uidElement = screen.getByText('user-123');
                expect(uidElement).toHaveClass('font-mono');
            });
        });
    });

    describe('Layout and styling', () => {
        it('should have correct container classes', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            const { container } = render(await DashboardPage());

            await waitFor(() => {
                const mainDiv = container.querySelector('.min-h-screen.bg-gray-100.p-8');
                expect(mainDiv).toBeInTheDocument();
            });
        });

        it('should have centered content with max width', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            const { container } = render(await DashboardPage());

            await waitFor(() => {
                const contentDiv = container.querySelector('.max-w-4xl.mx-auto');
                expect(contentDiv).toBeInTheDocument();
            });
        });

        it('should have card styling', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            const { container } = render(await DashboardPage());

            await waitFor(() => {
                const card = container.querySelector('.bg-white.rounded-lg.shadow-lg.p-6');
                expect(card).toBeInTheDocument();
            });
        });

        it('should have border dividers between sections', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            const { container } = render(await DashboardPage());

            await waitFor(() => {
                const dividers = container.querySelectorAll('.border-b.border-gray-200.pb-4');
                expect(dividers.length).toBe(2);
            });
        });
    });

    describe('Error handling', () => {
        it('should handle missing email_verified field', async () => {
            const tokenWithoutVerified = {
                decodedToken: {
                    uid: 'user-123',
                    email: 'test@example.com',
                    // email_verified is intentionally omitted
                },
                sessionCookie: 'mock-session-cookie',
            };
            (getAuthTokens as jest.Mock).mockResolvedValue(tokenWithoutVerified);

            render(await DashboardPage());

            await waitFor(() => {
                // Should show ❌ when email_verified is undefined
                expect(screen.getByText('❌ No')).toBeInTheDocument();
            });
        });
    });

    describe('Snapshot', () => {
        it('should match snapshot when authenticated', async () => {
            (getAuthTokens as jest.Mock).mockResolvedValue(mockTokens);

            const { container } = render(await DashboardPage());

            await waitFor(() => {
                expect(container).toMatchSnapshot();
            });
        });
    });
});
