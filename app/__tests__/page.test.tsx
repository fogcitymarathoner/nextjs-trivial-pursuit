/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import Home from '../page';
import '@testing-library/jest-dom';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Home Page', () => {
  it('renders the heading with correct text', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('If this is blue and big, Tailwind is working!');
  });

  it('applies all Tailwind CSS classes', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-5xl');
    expect(heading).toHaveClass('font-bold');
    expect(heading).toHaveClass('text-blue-600');
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

  it('loads environment variables from .env.local', () => {
    const dotenv = require('dotenv');
    expect(dotenv.config).toHaveBeenCalledWith({ path: '.env.local' });
  });
});