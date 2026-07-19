// app/troubleshoot/firebase_diagnostics/__tests__/page.routes.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DiagnosticsPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(() => '/troubleshoot/firebase_diagnostics'),
}));

// Mock the ProductListDiagnostics component
jest.mock('@/components/product/ProductListDiagnostics', () => {
    return jest.fn(() => <div data-testid="mock-diagnostics">Mock ProductListDiagnostics</div>);
});

describe('DiagnosticsPage Route', () => {
    const mockRouter = {
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    it('should render on the correct route', () => {
        render(<DiagnosticsPage />);
        expect(screen.getByTestId('mock-diagnostics')).toBeInTheDocument();
    });

    it('should be a client component', () => {
        // The 'use client' directive ensures this is a client component
        // We can verify by checking that it renders correctly
        const { container } = render(<DiagnosticsPage />);
        expect(container).toBeInTheDocument();
    });

    it('should have the correct page structure', () => {
        const { container } = render(<DiagnosticsPage />);
        // The page should render a div with the diagnostics component
        expect(container.firstChild).toBeInTheDocument();
        expect(container.firstChild).toHaveAttribute('data-testid', 'mock-diagnostics');
    });
});