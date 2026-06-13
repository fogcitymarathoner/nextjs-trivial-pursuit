/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
// Polyfill MessageChannel for react-dom/server in Jest (jsdom/node doesn't provide it)
if (typeof (global as any).MessageChannel === 'undefined') {
  (global as any).MessageChannel = class {
    port1: any;
    port2: any;
    constructor() {
      this.port1 = {};
      this.port2 = {};
    }
  };
}
// Polyfill TextEncoder/TextDecoder for react-dom/server
if (typeof (global as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout from '../layout';
import '@testing-library/jest-dom';

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Geist: jest.fn(() => ({
    variable: 'geist-sans-variable',
    subsets: ['latin'],
  })),
  Geist_Mono: jest.fn(() => ({
    variable: 'geist-mono-variable',
    subsets: ['latin'],
  })),
}));

// Mock the Header component
jest.mock('@/components/layout/Header/header', () => ({
  __esModule: true,
  default: () => <header data-testid="mock-header">Mock Header</header>,
}));

// Mock global CSS
jest.mock('../globals.css', () => ({}));

describe('RootLayout', () => {
  const defaultProps = {
    children: <div data-testid="test-child">Test Child Content</div>,
  };

  beforeEach(() => {
    // Render to static markup and populate document to avoid nesting <html> inside test container
    const markup = renderToStaticMarkup(<RootLayout {...defaultProps} />);
    const htmlMatch = markup.match(/<html([^>]*)>/);
    if (htmlMatch) {
      const langMatch = htmlMatch[1].match(/lang=["']([^"']+)["']/);
      if (langMatch) document.documentElement.lang = langMatch[1];
      const classMatch = htmlMatch[1].match(/class=["']([^"']*)["']/);
      if (classMatch) document.documentElement.className = classMatch[1];
    }
    const bodyMatch = markup.match(/<body([^>]*)>([\s\S]*?)<\/body>/);
    if (bodyMatch) {
      const bodyClassMatch = bodyMatch[1].match(/class=["']([^"']*)["']/);
      if (bodyClassMatch) document.body.className = bodyClassMatch[1];
      document.body.innerHTML = bodyMatch[2];
    } else {
      document.body.innerHTML = '';
    }
  });

  it('renders without crashing', () => {
    expect(document.querySelector('html')).toBeInTheDocument();
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('renders the Header component', () => {
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByText('Mock Header')).toBeInTheDocument();
  });

  it('renders children content', () => {
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('has correct HTML structure', () => {
    const html = document.querySelector('html');
    expect(html).toHaveAttribute('lang', 'en');
    expect(html?.className).toContain('geist-sans-variable');
    expect(html?.className).toContain('geist-mono-variable');
    expect(html?.className).toContain('h-full');
    expect(html?.className).toContain('antialiased');
  });

  it('has correct body classes', () => {
    const body = document.querySelector('body');
    expect(body?.className).toContain('min-h-full');
    expect(body?.className).toContain('flex');
    expect(body?.className).toContain('flex-col');
    expect(body?.className).toContain('bg-gray-50');
    expect(body?.className).toContain('text-gray-900');
    expect(body?.className).toContain('antialiased');
  });

  it('has correct main section structure', () => {
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main?.className).toContain('flex-1');
    expect(main?.className).toContain('w-full');
  });

  it('has correct container div classes', () => {
    const container = document.querySelector('.container');
    expect(container).toBeInTheDocument();
    expect(container?.className).toContain('max-w-9xl');
    expect(container?.className).toContain('mx-auto');
    expect(container?.className).toContain('px-4');
    expect(container?.className).toContain('sm:px-6');
    expect(container?.className).toContain('lg:px-8');
    expect(container?.className).toContain('py-8');
    expect(container?.className).toContain('md:py-12');
  });

  it('has correct document structure order', () => {
    const html = document.querySelector('html') as HTMLElement | null;
    const body = html?.querySelector('body') as HTMLElement | null;
    const header = body?.querySelector('[data-testid="mock-header"]') as HTMLElement | null;
    const main = body?.querySelector('main') as HTMLElement | null;
    const child = main?.querySelector('[data-testid="test-child"]') as HTMLElement | null;

    expect(html).toContainElement(body || null);
    expect(body).toContainElement(header || null);
    expect(body).toContainElement(main || null);
    expect(main).toContainElement(child || null);
  });
});

describe('RootLayout Metadata', () => {
  it('exports correct metadata', () => {
    const { metadata } = require('../layout');
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('Trivia App');
    expect(metadata.description).toBe('Test your knowledge with Wikipedia-powered trivia');
  });
});

describe('RootLayout with different children', () => {
  it('renders with complex children', () => {
    const complexChildren = (
      <div>
        <h1>Test Heading</h1>
        <p>Test paragraph</p>
        <button>Test button</button>
      </div>
    );
    
    render(<RootLayout>{complexChildren}</RootLayout>);
    
    expect(screen.getByText('Test Heading')).toBeInTheDocument();
    expect(screen.getByText('Test paragraph')).toBeInTheDocument();
    expect(screen.getByText('Test button')).toBeInTheDocument();
  });

  it('renders with empty children', () => {
    render(<RootLayout>{null}</RootLayout>);
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main?.querySelector('.container')).toBeInTheDocument();
  });
});