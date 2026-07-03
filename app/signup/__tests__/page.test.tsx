// app/signup/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import SignupPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: jest.fn(),
}));

// Mock firebase client
jest.mock('@/lib/firebase/client', () => ({
    auth: {},
}));

// Mock fetch
global.fetch = jest.fn();

describe('SignupPage', () => {
    const mockRouter = {
        push: jest.fn(),
        refresh: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    describe('Rendering', () => {
        it('should render the signup page title', () => {
            render(<SignupPage />);
            expect(screen.getByText('Create your account')).toBeInTheDocument();
        });

        it('should render the email input', () => {
            render(<SignupPage />);
            expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
        });

        it('should render the password input', () => {
            render(<SignupPage />);
            expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        });

        it('should render the confirm password input', () => {
            render(<SignupPage />);
            expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
        });

        it('should render the sign up button', () => {
            render(<SignupPage />);
            expect(screen.getByText('Sign up')).toBeInTheDocument();
        });

        it('should render the login link', () => {
            render(<SignupPage />);
            expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument();
        });

        it('should not render error message initially', () => {
            render(<SignupPage />);
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        it('should render button with "Creating account..." text when loading', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockImplementation(() =>
                new Promise((resolve) => setTimeout(resolve, 100))
            );

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            // Should show loading text
            expect(screen.getByText('Creating account...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Sign up')).toBeInTheDocument();
            });
        });
    });

    describe('Layout and styling', () => {
        it('should have correct container classes', () => {
            const { container } = render(<SignupPage />);
            const mainDiv = container.querySelector('.min-h-screen.flex.items-center.justify-center.bg-gray-50');
            expect(mainDiv).toBeInTheDocument();
        });

        it('should have max-w-md width container', () => {
            const { container } = render(<SignupPage />);
            const containerDiv = container.querySelector('.max-w-md.w-full.space-y-8');
            expect(containerDiv).toBeInTheDocument();
        });

        it('should have correct heading classes', () => {
            const { container } = render(<SignupPage />);
            const heading = container.querySelector('h2.text-3xl.font-extrabold.text-gray-900');
            expect(heading).toBeInTheDocument();
            expect(heading).toHaveTextContent('Create your account');
        });

        it('should have input with correct classes', () => {
            render(<SignupPage />);
            const emailInput = screen.getByPlaceholderText('Email address');
            expect(emailInput).toHaveClass('appearance-none', 'rounded-none', 'relative', 'block', 'w-full');
        });

        it('should have button with correct classes', () => {
            render(<SignupPage />);
            const button = screen.getByText('Sign up');
            expect(button).toHaveClass('group', 'relative', 'w-full', 'flex', 'justify-center');
            expect(button).toHaveClass('bg-indigo-600', 'hover:bg-indigo-700');
            expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
        });

        it('should have login link with correct classes', () => {
            render(<SignupPage />);
            const link = screen.getByText('Already have an account? Sign in');
            expect(link).toHaveClass('font-medium', 'text-indigo-600', 'hover:text-indigo-500');
            expect(link).toHaveAttribute('href', '/login');
        });
    });

    describe('Form validation', () => {
        it('should show error when passwords do not match', async () => {
            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
            });
        });

        it('should show error when password is less than 6 characters', async () => {
            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: '12345' } });
            fireEvent.change(confirmPasswordInput, { target: { value: '12345' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
            });
        });

        it('should not show error when passwords match and are valid', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockUserCredential = {
                user: mockUser,
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
                expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument();
            });
        });
    });

    describe('Authentication flow', () => {
        it('should call createUserWithEmailAndPassword on valid submission', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockUserCredential = {
                user: mockUser,
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
                    auth,
                    'test@example.com',
                    'password123'
                );
            });
        });

        it('should call fetch to create session after successful signup', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockUserCredential = {
                user: mockUser,
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: 'mock-id-token' }),
                });
            });
        });

        it('should redirect to dashboard on successful signup', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockUserCredential = {
                user: mockUser,
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ success: true }),
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
                expect(mockRouter.refresh).toHaveBeenCalled();
            });
        });

        it('should set loading state during signup', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockImplementation(() =>
                new Promise((resolve) => setTimeout(resolve, 100))
            );

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            expect(screen.getByText('Creating account...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Sign up')).toBeInTheDocument();
            });
        });
    });

    describe('Error handling', () => {
        it('should display error when signup fails', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
                message: 'Email already in use',
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Email already in use')).toBeInTheDocument();
            });
        });

        it('should handle errors without message property', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({});

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to create account')).toBeInTheDocument();
            });
        });

        it('should display error when session creation fails', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockUserCredential = {
                user: mockUser,
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: jest.fn().mockResolvedValue({ error: 'Session creation failed' }),
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to create session')).toBeInTheDocument();
            });
        });

        it('should handle fetch network errors', async () => {
            const mockUser = {
                getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
            };
            const mockUserCredential = {
                user: mockUser,
            };
            (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });
    });

    describe('Button states', () => {
        it('should disable button while loading', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockImplementation(() =>
                new Promise((resolve) => setTimeout(resolve, 100))
            );

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            expect(submitButton).toBeDisabled();

            await waitFor(() => {
                expect(submitButton).not.toBeDisabled();
            });
        });

        it('should show loading text on button while loading', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockImplementation(() =>
                new Promise((resolve) => setTimeout(resolve, 100))
            );

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            expect(screen.getByText('Creating account...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Sign up')).toBeInTheDocument();
            });
        });
    });

    describe('Input handling', () => {
        it('should update email state on change', () => {
            render(<SignupPage />);
            const emailInput = screen.getByPlaceholderText('Email address');
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            expect(emailInput).toHaveValue('test@example.com');
        });

        it('should update password state on change', () => {
            render(<SignupPage />);
            const passwordInput = screen.getByPlaceholderText('Password');
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            expect(passwordInput).toHaveValue('password123');
        });

        it('should update confirm password state on change', () => {
            render(<SignupPage />);
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            expect(confirmPasswordInput).toHaveValue('password123');
        });
    });

    describe('Accessibility', () => {
        it('should have heading with appropriate level', () => {
            render(<SignupPage />);
            const heading = screen.getByRole('heading', { level: 2 });
            expect(heading).toBeInTheDocument();
            expect(heading).toHaveTextContent('Create your account');
        });

        it('should have email input with appropriate type', () => {
            render(<SignupPage />);
            const emailInput = screen.getByPlaceholderText('Email address');
            expect(emailInput).toHaveAttribute('type', 'email');
        });

        it('should have password input with appropriate type', () => {
            render(<SignupPage />);
            const passwordInput = screen.getByPlaceholderText('Password');
            expect(passwordInput).toHaveAttribute('type', 'password');
        });

        it('should have confirm password input with appropriate type', () => {
            render(<SignupPage />);
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            expect(confirmPasswordInput).toHaveAttribute('type', 'password');
        });

        it('should have button with appropriate type', () => {
            render(<SignupPage />);
            const button = screen.getByText('Sign up');
            expect(button).toHaveAttribute('type', 'submit');
        });

        it('should have error message visible with appropriate classes', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
                message: 'Email already in use',
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                const error = screen.getByText('Email already in use');
                expect(error).toBeInTheDocument();
                expect(error).toHaveClass('text-red-500', 'text-sm', 'text-center');
            });
        });
    });

    describe('Snapshot', () => {
        it('should match snapshot', () => {
            const { container } = render(<SignupPage />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot with error', async () => {
            (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
                message: 'Email already in use',
            });

            render(<SignupPage />);

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');
            const confirmPasswordInput = screen.getByPlaceholderText('Confirm password');
            const submitButton = screen.getByText('Sign up');

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                const { container } = render(<SignupPage />);
                expect(container).toMatchSnapshot();
            });
        });
    });
});