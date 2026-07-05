/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavBar } from '../navbar';
import '@testing-library/jest-dom';

// Mock the NavLink component
jest.mock('@/components/navlink', () => ({
  NavLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
      <a href={href} className={className || ''}>
        {children}
      </a>
  ),
}));

const mockUsePathname = jest.fn();
const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockUsePathname(),
}));

describe('NavBar', () => {
  let mockFetch: jest.Mock;
  let user: ReturnType<typeof userEvent.setup>;
  const createDeferredResponse = () => {
    let resolve: (value: { ok: boolean }) => void = () => {};
    let reject: (reason?: unknown) => void = () => {};
    const promise = new Promise<{ ok: boolean }>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });

    return { promise, resolve, reject };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders links for the main routes', async () => {
    mockUsePathname.mockReturnValue('/marc');
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<NavBar />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Marc' })).toHaveAttribute('href', '/marc');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });
  });

  it('shows loading skeleton initially', () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<NavBar />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('shows Login link when user is not authenticated', async () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('shows Logout button when user is authenticated', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    // Mock authenticated response
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<NavBar />);

    // Wait for Logout button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
  });

  it('shows authenticated games button and toggles game links', async () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<NavBar />);

    const gamesButton = await screen.findByRole('button', { name: 'Games' });
    expect(gamesButton).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Game 1' })).not.toBeInTheDocument();

    await user.click(gamesButton);

    expect(screen.getByRole('link', { name: 'Game 1' })).toHaveAttribute('href', '/games/game1');
    expect(screen.getByRole('link', { name: 'Game 2' })).toHaveAttribute('href', '/games/game2');

    await user.click(gamesButton);

    expect(screen.queryByRole('link', { name: 'Game 1' })).not.toBeInTheDocument();
  });

  it('handles logout successfully', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    const logoutResponse = createDeferredResponse();

    // First fetch for auth check - returns authenticated
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Second fetch for logout stays pending while the logging-out state is asserted
    mockFetch.mockImplementationOnce(() => logoutResponse.promise);

    render(<NavBar />);

    // Wait for Logout button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    // Click logout
    await user.click(screen.getByRole('button', { name: 'Logout' }));

    // Now check for "Logging out..." text
    await waitFor(() => {
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
    });

    await act(async () => {
      logoutResponse.resolve({ ok: true });
      await logoutResponse.promise;
    });

    // Wait for logout to complete
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('handles logout failure gracefully', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    const logoutResponse = createDeferredResponse();

    // First fetch for auth check - returns authenticated
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Second fetch for logout stays pending while the logging-out state is asserted
    mockFetch.mockImplementationOnce(() => logoutResponse.promise);

    render(<NavBar />);

    // Wait for Logout button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    // Click logout
    await user.click(screen.getByRole('button', { name: 'Logout' }));

    // Check for "Logging out..." text
    await waitFor(() => {
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
    });

    await act(async () => {
      logoutResponse.resolve({ ok: false });
      await logoutResponse.promise;
    });

    // Should recover from error and show Logout button again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('handles logout network error', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    const logoutResponse = createDeferredResponse();

    // First fetch for auth check - returns authenticated
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Second fetch for logout stays pending while the logging-out state is asserted
    mockFetch.mockImplementationOnce(() => logoutResponse.promise);

    render(<NavBar />);

    // Wait for Logout button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    // Click logout
    await user.click(screen.getByRole('button', { name: 'Logout' }));

    // Check for "Logging out..." text
    await waitFor(() => {
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
    });

    await act(async () => {
      logoutResponse.reject(new Error('Network error'));
      await logoutResponse.promise.catch(() => undefined);
    });

    // Should recover from error and show Logout button again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.refresh).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
  });

  it('re-checks auth status when pathname changes', async () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { rerender } = render(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });

    mockUsePathname.mockReturnValue('/dashboard');
    mockFetch.mockResolvedValueOnce({ ok: true });

    rerender(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });

  it('handles auth check failure', async () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockRejectedValueOnce(new Error('Auth check failed'));

    render(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });
    expect(console.error).toHaveBeenCalledWith('Auth check failed:', expect.any(Error));
  });

  it('re-checks auth status when tab becomes visible', async () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<NavBar />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({ ok: true });

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });

  it('cleans up visibility event listener on unmount', () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = render(<NavBar />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('does not show logout button when logging out', async () => {
    mockUsePathname.mockReturnValue('/dashboard');

    // First fetch for auth check - returns authenticated
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Keep the logout fetch pending
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<NavBar />);

    // Wait for Logout button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    // Click logout
    await user.click(screen.getByRole('button', { name: 'Logout' }));

    // Should show "Logging out..." instead of Logout button
    await waitFor(() => {
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('highlights Login link when on login page', async () => {
    mockUsePathname.mockReturnValue('/login');
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<NavBar />);

    await waitFor(() => {
      const loginLink = screen.getByRole('link', { name: 'Login' });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  it('shows Login link without active styles when not on login page', async () => {
    mockUsePathname.mockReturnValue('/');
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<NavBar />);

    await waitFor(() => {
      const loginLink = screen.getByRole('link', { name: 'Login' });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });
});
