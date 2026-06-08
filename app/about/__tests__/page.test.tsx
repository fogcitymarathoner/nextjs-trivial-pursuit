/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import AboutPage from '../page';
import '@testing-library/jest-dom';



describe('AboutPage', () => {
  beforeEach(() => {
    render(<AboutPage />);
  });

  it('renders without crashing', () => {
    expect(screen.getByText(/about this project/i)).toBeInTheDocument();
  });

  describe('Headings', () => {
    it('renders main heading', () => {
      expect(screen.getByRole('heading', { level: 1, name: /about this project/i })).toBeInTheDocument();
    });

    it('renders stack heading', () => {
      expect(screen.getByRole('heading', { level: 2, name: /stack/i })).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('renders description text', () => {
      expect(screen.getByText(/test your knowledge/i)).toBeInTheDocument();
    });

    it('renders deployment info with link', () => {
      expect(screen.getByText(/deploys to/i)).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'GCP' });
      expect(link).toHaveAttribute('href', '/');
    });

    it('renders all stack technologies', () => {
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(screen.getByText('Node.js v24.14.0')).toBeInTheDocument();
      expect(screen.getByText('Approuter')).toBeInTheDocument();
      expect(screen.getByText('Pinecone')).toBeInTheDocument();
      expect(screen.getByText('3k vectors .5 similiarity threshold')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct container classes', () => {
      const heading = screen.getByText(/about this project/i);
      const container = heading.closest('div.space-y-6');
      expect(container).toBeInTheDocument();
    });
  });
});