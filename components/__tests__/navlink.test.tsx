/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NavLink } from '../navlink';
import '@testing-library/jest-dom';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
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

describe('NavLink', () => {
  it('renders active link styling for the current pathname', () => {
    mockUsePathname.mockReturnValue('/about');

    render(<NavLink href="/about">About</NavLink>);

    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveAttribute('href', '/about');
    expect(link).toHaveClass('bg-blue-900', 'text-white');
  });

  it('renders inactive link styling for other pathnames', () => {
    mockUsePathname.mockReturnValue('/');

    render(<NavLink href="/about">About</NavLink>);

    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveClass('text-blue-700', 'hover:text-blue-900', 'hover:bg-blue-100');
    expect(link).not.toHaveClass('bg-blue-900');
  });
});
