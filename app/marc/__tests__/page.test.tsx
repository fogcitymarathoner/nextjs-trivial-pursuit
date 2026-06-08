/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import MarcPage from '../page';
import '@testing-library/jest-dom';

describe('MarcPage', () => {
  describe('Metadata', () => {
    it('exports correct metadata', () => {
      const { metadata } = require('../page');
      expect(metadata).toEqual({
        title: 'Marc',
        description: 'Learn about Marc',
      });
    });
  });

  describe('Rendering & Content', () => {
    it('renders the main heading with correct text', () => {
      render(<MarcPage />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About Marc');
    });

    it('renders the description text', () => {
      render(<MarcPage />);
      expect(screen.getByText(/this page is dedicated to marc/i)).toBeInTheDocument();
    });

    it('renders exactly one heading', () => {
      render(<MarcPage />);
      expect(screen.getAllByRole('heading')).toHaveLength(1);
    });
  });

  describe('Styling', () => {
    it('applies correct Tailwind classes', () => {
      render(<MarcPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-3xl', 'font-bold');
      
      const description = screen.getByText(/this page is dedicated to marc/i);
      expect(description).toHaveClass('text-gray-600');
      
      const container = screen.getByText('About Marc').closest('div');
      expect(container).toHaveClass('space-y-6');
    });
  });

  describe('Edge Cases', () => {
    it('handles re-renders correctly', () => {
      const { rerender } = render(<MarcPage />);
      expect(screen.getByText('About Marc')).toBeInTheDocument();
      
      // Rerender the same component (this replaces the existing one)
      rerender(<MarcPage />);
      expect(screen.getByText('About Marc')).toBeInTheDocument();
      expect(screen.getAllByRole('heading')).toHaveLength(1); // Still only one heading
    });

    it('has valid HTML structure with proper nesting', () => {
      const { container } = render(<MarcPage />);
      
      const div = container.querySelector('div');
      const h1 = div?.querySelector('h1');
      const p = div?.querySelector('p');
      
      expect(div).toBeInTheDocument();
      expect(h1).toBeInTheDocument();
      expect(p).toBeInTheDocument();
      expect(div?.contains(h1 as Node)).toBe(true);
      expect(div?.contains(p as Node)).toBe(true);
    });

    it('does not contain unexpected content', () => {
      render(<MarcPage />);
      const unexpectedTexts = ['Click here', 'Subscribe', 'Sign up'];
      unexpectedTexts.forEach(text => {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
      });
    });

    it('cleans up properly on unmount', () => {
      const { unmount } = render(<MarcPage />);
      expect(screen.getByText('About Marc')).toBeInTheDocument();
      
      unmount();
      expect(screen.queryByText('About Marc')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<MarcPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.tagName).toBe('H1');
    });
  });
});

describe('MarcPage Snapshot', () => {
  it.skip('matches snapshot', () => {
    const { container } = render(<MarcPage />);
    expect(container).toMatchSnapshot();
  });
});