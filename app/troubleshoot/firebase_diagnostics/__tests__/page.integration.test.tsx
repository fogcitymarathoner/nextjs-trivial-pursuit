// app/troubleshoot/firebase_diagnostics/__tests__/page.integration.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import DiagnosticsPage from '../page';

// Mock the actual ProductListDiagnostics component's dependencies
jest.mock('@/lib/firebase/client', () => ({
    db: {
        _delegate: {},
        type: 'mock-firestore',
        app: { name: '[DEFAULT]' },
    },
    app: {
        name: '[DEFAULT]',
        options: {
            apiKey: 'test-api-key',
            authDomain: 'test-auth-domain.firebaseapp.com',
            projectId: 'test-project-id',
        },
    },
}));

jest.mock('@/lib/firebase/config', () => ({
    firebaseConfig: {
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain.firebaseapp.com',
        projectId: 'test-project-id',
        storageBucket: 'test-project-id.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef123456',
    },
    firestoreDatabaseId: '(default)',
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(() => ({ type: 'collection-ref' })),
    getDocs: jest.fn(() => Promise.resolve({
        forEach: jest.fn(),
        docs: [],
    })),
    onSnapshot: jest.fn(() => jest.fn()),
    clearIndexedDbPersistence: jest.fn(() => Promise.resolve()),
    terminate: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/firestore/productService', () => ({
    productService: {
        getAllProducts: jest.fn(() => Promise.resolve([])),
    },
}));

// Import after mocks
import { productService } from '@/lib/firestore/productService';
import { getDocs } from 'firebase/firestore';

describe('DiagnosticsPage Integration', () => {
    const mockGetAllProducts = productService.getAllProducts as jest.MockedFunction<typeof productService.getAllProducts>;
    const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAllProducts.mockResolvedValue([]);
        mockGetDocs.mockResolvedValue({
            forEach: jest.fn(),
            docs: [],
        } as any);
    });

    it('should render the diagnostics page with loading state initially', () => {
        render(<DiagnosticsPage />);
        expect(screen.getByText('Running diagnostics...')).toBeInTheDocument();
    });

    it('should render the full diagnostics after loading', async () => {
        // Mock some products
        const mockProducts = [
            {
                id: '1',
                name: 'Test Product',
                price: 29.99,
                description: 'Test description',
                category: 'Electronics',
                inStock: true,
            },
        ];

        mockGetAllProducts.mockResolvedValue(mockProducts as any);
        mockGetDocs.mockResolvedValue({
            forEach: (callback: (doc: any) => void) => {
                mockProducts.forEach(product => {
                    callback({
                        id: product.id,
                        data: () => product,
                    });
                });
            },
            docs: mockProducts.map(product => ({
                id: product.id,
                data: () => product,
            })),
        } as any);

        render(<DiagnosticsPage />);

        await waitFor(() => {
            expect(screen.getByText('🔍 Firebase Products Diagnostics')).toBeInTheDocument();
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText('$29.99')).toBeInTheDocument();
        });
    });

    it('should display the page title', async () => {
        render(<DiagnosticsPage />);

        await waitFor(() => {
            expect(screen.getByText('🔍 Firebase Products Diagnostics')).toBeInTheDocument();
        });
    });
});