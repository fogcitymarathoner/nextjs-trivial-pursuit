/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import Home from '../page';
import '@testing-library/jest-dom';

describe('Home Page', () => {
  it('renders the heading with correct text', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('If this is blue and big, Tailwind is working!');
  });

  it('applies shared global page classes', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('page-title');
    expect(heading.closest('.app-container')).toBeInTheDocument();
    expect(screen.getByText(/Use these global page/i).closest('.surface-panel')).toBeInTheDocument();
  });

  it('has correct heading level for accessibility', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
  });

  it('contains only text without nested elements', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.children).toHaveLength(0);
    expect(heading.textContent).toBeTruthy();
  });
});
