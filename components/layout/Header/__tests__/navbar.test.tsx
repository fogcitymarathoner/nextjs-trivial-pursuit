/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NavBar } from '../navbar';
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

describe('NavBar', () => {
  it('renders links for the main routes', () => {
    mockUsePathname.mockReturnValue('/marc');

    render(<NavBar />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Marc' })).toHaveClass('bg-blue-900', 'text-white');
  });
});
