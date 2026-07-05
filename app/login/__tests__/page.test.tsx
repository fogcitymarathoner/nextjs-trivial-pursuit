// app/login/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import LoginPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock firebase/auth - define the mock inside the factory
jest.mock('firebase/auth', () => {
    const mockGoogleAuthProvider = jest.fn().mockImplementation(() => ({}));
    return {
        signInWithPopup: jest.fn(),
        GoogleAuthProvider: mockGoogleAuthProvider,
    };
});

// Mock firebase client
jest.mock('@/lib/firebase/client', () => ({
    getFirebaseAuth: jest.fn().mockReturnValue({}),
}));

// Mock fetch
global.fetch = jest.fn();

describe('LoginPage', () => {
    const mockRouter = {
        push: jest.fn(),
        refresh: jest.fn(),
    };
    const mockDelayedSuccessfulSignIn = () => {
        const mockUser = {
            getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
        };

        (signInWithPopup as jest.Mock).mockImplementation(() =>
            new Promise((resolve) => setTimeout(() => resolve({ user: mockUser }), 100))
        );
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true }),
        });
    };

    let mockGoogleAuthProvider: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);

        mockGoogleAuthProvider = GoogleAuthProvider as unknown as jest.Mock;
        mockGoogleAuthProvider.mockClear();
        mockGoogleAuthProvider.mockImplementation(() => ({}));
        (getFirebaseAuth as jest.Mock).mockReturnValue({});
    });

    describe('Rendering', () => {
        it('should render the login page title', () => {
            render(<LoginPage />);
            expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
        });

        it('should render the login description', () => {
            render(<LoginPage />);
            expect(screen.getByText('Use your Google account to sign in')).toBeInTheDocument();
        });

        it('should render the Google sign-in button', () => {
            render(<LoginPage />);
            expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
        });

        it('should render the Google icon SVG', () => {
            render(<LoginPage />);
            const svg = document.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });

        it('should not render error message initially', () => {
            render(<LoginPage />);
            expect(screen.queryByText(/Test error/)).not.toBeInTheDocument();
        });

        it('should render button with "Signing in..." text when loading', () => {
            (signInWithPopup as jest.Mock).mockImplementation(() => new Promise(() => undefined));

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            expect(screen.getByText('Signing in...')).toBeInTheDocument();
        });
    });

    describe('Layout and styling', () => {
        it('should have correct container classes', () => {
            const { container } = render(<LoginPage />);
            const mainDiv = container.querySelector('.min-h-screen.flex.items-center.justify-center.bg-gray-50');
            expect(mainDiv).toBeInTheDocument();
        });

        it('should have max-w-md width container', () => {
            const { container } = render(<LoginPage />);
            const containerDiv = container.querySelector('.max-w-md.w-full.space-y-8');
            expect(containerDiv).toBeInTheDocument();
        });

        it('should have correct heading classes', () => {
            const { container } = render(<LoginPage />);
            const heading = container.querySelector('h2.text-3xl.font-extrabold.text-gray-900');
            expect(heading).toBeInTheDocument();
            expect(heading).toHaveTextContent('Sign in to your account');
        });

        it('should have button with correct classes', () => {
            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            expect(button).toHaveClass('w-full', 'flex', 'items-center', 'justify-center', 'gap-3');
            expect(button).toHaveClass('border-gray-300', 'bg-white', 'hover:bg-gray-50', 'text-gray-700');
            expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
        });

        it('should have error alert with correct classes', async () => {
            render(<LoginPage />);
            (signInWithPopup as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                const errorDiv = screen.getByText('Test error').closest('.rounded-md.bg-red-50.p-3');
                expect(errorDiv).toBeInTheDocument();
            });
        });
    });

    describe('Authentication flow', () => {
        it('should call signInWithPopup when button is clicked', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockResult = {
                user: mockUser,
            };
            (signInWithPopup as jest.Mock).mockResolvedValue(mockResult);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(signInWithPopup).toHaveBeenCalled();
                expect(mockGoogleAuthProvider).toHaveBeenCalled();
            });
        });

        it('should call fetch to create session after successful login', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockResult = {
                user: mockUser,
            };
            (signInWithPopup as jest.Mock).mockResolvedValue(mockResult);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: 'mock-id-token' }),
                });
            });
        });

        it('should redirect to dashboard on successful login', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockResult = {
                user: mockUser,
            };
            (signInWithPopup as jest.Mock).mockResolvedValue(mockResult);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
                expect(mockRouter.refresh).toHaveBeenCalled();
            });
        });

        it('should set loading state during authentication', async () => {
            mockDelayedSuccessfulSignIn();

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            expect(screen.getByText('Signing in...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
            });
        });
    });

    describe('Error handling', () => {
        it('should display error when popup is closed by user', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({
                code: 'auth/popup-closed-by-user',
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Sign-in popup was closed. Please try again.')).toBeInTheDocument();
            });
        });

        it('should display error when popup is blocked', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({
                code: 'auth/popup-blocked',
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Pop-up was blocked. Please allow pop-ups for this site.')).toBeInTheDocument();
            });
        });

        it('should display error when domain is unauthorized', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({
                code: 'auth/unauthorized-domain',
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('This domain is not authorized. Please contact support.')).toBeInTheDocument();
            });
        });

        it('should display generic error message for other errors', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({
                message: 'Something went wrong',
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Something went wrong')).toBeInTheDocument();
            });
        });

        it('should display error when session creation fails', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockResult = {
                user: mockUser,
            };
            (signInWithPopup as jest.Mock).mockResolvedValue(mockResult);
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: jest.fn().mockResolvedValue({ error: 'Session creation failed' }),
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Session creation failed')).toBeInTheDocument();
            });
        });

        it('should handle fetch network errors', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockResult = {
                user: mockUser,
            };
            (signInWithPopup as jest.Mock).mockResolvedValue(mockResult);
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });

        it('should handle errors without message property', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({});

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Failed to login. Please try again.')).toBeInTheDocument();
            });
        });
    });

    describe('Button states', () => {
        it('should disable button while loading', async () => {
            mockDelayedSuccessfulSignIn();

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            expect(button).toBeDisabled();

            await waitFor(() => {
                expect(button).not.toBeDisabled();
            });
        });

        it('should show loading text on button while loading', async () => {
            mockDelayedSuccessfulSignIn();

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            expect(screen.getByText('Signing in...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('should have heading with appropriate level', () => {
            render(<LoginPage />);
            const heading = screen.getByRole('heading', { level: 2 });
            expect(heading).toBeInTheDocument();
            expect(heading).toHaveTextContent('Sign in to your account');
        });

        it('should have button with appropriate role', () => {
            render(<LoginPage />);
            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveTextContent('Sign in with Google');
        });

        it('should have error message visible', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({
                message: 'Test error',
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                const error = screen.getByText('Test error');
                expect(error).toBeInTheDocument();
                expect(error).toHaveClass('text-sm', 'text-red-600');
            });
        });

        it('should have SVG icon with appropriate attributes', () => {
            render(<LoginPage />);
            const svg = document.querySelector('svg');
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveClass('w-5', 'h-5');
        });
    });

    describe('Snapshot', () => {
        it('should match snapshot', () => {
            const { container } = render(<LoginPage />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot with error', async () => {
            (signInWithPopup as jest.Mock).mockRejectedValue({
                message: 'Test error',
            });

            render(<LoginPage />);
            const button = screen.getByText('Sign in with Google');
            fireEvent.click(button);

            await waitFor(() => {
                const { container } = render(<LoginPage />);
                expect(container).toMatchSnapshot();
            });
        });
    });
});
