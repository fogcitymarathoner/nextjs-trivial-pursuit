/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import Header from '../header';
import '@testing-library/jest-dom';

const mockUsePathname = jest.fn();
const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  });

  it('renders the navigation bar links', async () => {
    mockUsePathname.mockReturnValue('/');

    render(<Header />);

    expect(screen.getByRole('navigation')).toHaveClass('hidden', 'md:flex', 'space-x-8');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Marc' })).toHaveAttribute('href', '/marc');
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });
  });
});
