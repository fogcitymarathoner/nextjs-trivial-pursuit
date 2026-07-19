// app/troubleshoot/firebase_diagnostics/__tests__/page.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DiagnosticsPage from '../page';

// Mock all dependencies
jest.mock('@/lib/firebase/client', () => ({
    db: {},
    app: {},
}));

jest.mock('@/lib/firebase/config', () => ({
    firebaseConfig: {
        projectId: 'test-project',
        authDomain: 'test-auth',
    },
    firestoreDatabaseId: '(default)',
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    getDocs: jest.fn(),
    onSnapshot: jest.fn(),
    clearIndexedDbPersistence: jest.fn(),
    terminate: jest.fn(),
}));

jest.mock('@/lib/firestore/productService', () => ({
    productService: {
        getAllProducts: jest.fn(),
    },
}));

jest.mock('@/components/product/ProductListDiagnostics', () => {
    return jest.fn(() => <div data-testid="mock-diagnostics">Mock ProductListDiagnostics</div>);
});

describe('DiagnosticsPage', () => {
    it('should render the diagnostics page', () => {
        render(<DiagnosticsPage />);
        expect(screen.getByTestId('mock-diagnostics')).toBeInTheDocument();
        expect(screen.getByText('Mock ProductListDiagnostics')).toBeInTheDocument();
    });

    it('should render without crashing', () => {
        render(<DiagnosticsPage />);
        expect(screen.getByTestId('mock-diagnostics')).toBeInTheDocument();
    });
});