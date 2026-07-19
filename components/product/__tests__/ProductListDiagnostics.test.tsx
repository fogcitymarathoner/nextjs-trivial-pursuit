// components/product/__tests__/ProductListDiagnostics.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductListDiagnostics } from '../ProductListDiagnostics';
import { productService } from '../../../lib/firestore/productService';
import { Product } from '../../../lib/firestore/productTypes';
import type {
    DocumentData,
    FirestoreError,
    Query,
    QueryDocumentSnapshot,
    QuerySnapshot,
    Unsubscribe,
} from 'firebase/firestore';

// ==================== MOCKS ====================

// Mock Firebase client
jest.mock('../../../lib/firebase/client', () => ({
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

// Mock Firebase config
jest.mock('../../../lib/firebase/config', () => ({
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

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(() => ({ type: 'collection-ref' })),
    getDocs: jest.fn(),
    onSnapshot: jest.fn(() => jest.fn()),
    clearIndexedDbPersistence: jest.fn(() => Promise.resolve()),
    terminate: jest.fn(() => Promise.resolve()),
}));

// Mock product service
jest.mock('../../../lib/firestore/productService', () => ({
    productService: {
        getAllProducts: jest.fn(),
    },
}));

// Import after mocks
import {
    getDocs,
    onSnapshot,
    clearIndexedDbPersistence,
    terminate,
} from 'firebase/firestore';

// ==================== TEST DATA ====================

const mockProducts: Product[] = [
    {
        id: '1',
        name: 'Product 1',
        price: 29.99,
        description: 'Description 1',
        category: 'Electronics',
        inStock: true,
    },
    {
        id: '2',
        name: 'Product 2',
        price: 49.99,
        description: 'Description 2',
        category: 'Books',
        inStock: false,
    },
    {
        id: '3',
        name: 'Product 3',
        price: 19.99,
        description: 'Description 3',
        category: 'Clothing',
        inStock: true,
    },
] as Product[];

const productSnapshot = (products: Product[]): QuerySnapshot<DocumentData> => ({
    docs: products.map(product => ({
        id: product.id,
        data: () => product,
    })),
    forEach: (callback: (result: QueryDocumentSnapshot<DocumentData>) => void) => {
        products.forEach(product => callback({
            id: product.id,
            data: () => product,
        } as unknown as Parameters<typeof callback>[0]));
    },
} as unknown as QuerySnapshot<DocumentData>);

type SnapshotListener = (
    query: Query,
    onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
    onError?: (error: FirestoreError) => void,
) => Unsubscribe;

// ==================== TESTS ====================

describe('ProductListDiagnostics', () => {
    const mockGetAllProducts = productService.getAllProducts as jest.MockedFunction<typeof productService.getAllProducts>;
    const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
    const mockOnSnapshot = onSnapshot as unknown as jest.MockedFunction<SnapshotListener>;
    const mockClearIndexedDbPersistence = clearIndexedDbPersistence as jest.MockedFunction<typeof clearIndexedDbPersistence>;
    const mockTerminate = terminate as jest.MockedFunction<typeof terminate>;

    // Mock console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Mock console.log and console.error
        console.log = jest.fn();
        console.error = jest.fn();

        // Setup default mock returns
        mockGetAllProducts.mockResolvedValue(mockProducts);
        mockGetDocs.mockResolvedValue(productSnapshot(mockProducts));

        // Mock onSnapshot to simulate real-time updates
        mockOnSnapshot.mockImplementation((_collection, callback) => {
            callback(productSnapshot(mockProducts));
            return jest.fn();
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    describe('Rendering', () => {
        it('should show loading state initially', () => {
            render(<ProductListDiagnostics />);

            expect(screen.getByText('Running diagnostics...')).toBeInTheDocument();
            expect(screen.getByText('Running diagnostics...').previousSibling).toHaveClass('animate-spin');
        });

        it('should render diagnostics data after loading', async () => {
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('🔍 Firebase Products Diagnostics')).toBeInTheDocument();
                expect(screen.getByText('🎯 Critical Information')).toBeInTheDocument();
                expect(screen.getByText('📊 Product Count Analysis')).toBeInTheDocument();
            });
        });

        it('should display critical information correctly', async () => {
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Project ID:')).toBeInTheDocument();
                expect(screen.getByText('test-project-id')).toBeInTheDocument();
                expect(screen.getByText('Database ID:')).toBeInTheDocument();
                expect(screen.getByText('(default)')).toBeInTheDocument();
                expect(screen.getByText('Environment:')).toBeInTheDocument();
                expect(screen.getByText('Auth Domain:')).toBeInTheDocument();
                expect(screen.getByText('test-auth-domain.firebaseapp.com')).toBeInTheDocument();
            });
        });

        it('should display product counts correctly', async () => {
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getAllByText('3')).toHaveLength(3);
            });
        });

        it('should display products in the database', async () => {
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(screen.getByText('Product 2')).toBeInTheDocument();
                expect(screen.getByText('Product 3')).toBeInTheDocument();
                expect(screen.getByText('$29.99')).toBeInTheDocument();
                expect(screen.getByText('$49.99')).toBeInTheDocument();
                expect(screen.getByText('$19.99')).toBeInTheDocument();
                expect(screen.getByText(/Category: Electronics/)).toBeInTheDocument();
                expect(screen.getByText(/Category: Books/)).toBeInTheDocument();
                expect(screen.getByText(/Category: Clothing/)).toBeInTheDocument();
            });
        });

        it('should show discrepancy warning when counts differ', async () => {
            mockGetAllProducts.mockResolvedValue(mockProducts.slice(0, 2)); // Only 2 products
            mockGetDocs.mockResolvedValue(productSnapshot(mockProducts));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('⚠️ Discrepancy Detected!')).toBeInTheDocument();
                expect(screen.getByText(/Different product counts detected between query methods/)).toBeInTheDocument();
            });
        });
    });

    describe('Actions', () => {
        it('should refresh diagnostics when Refresh button is clicked', async () => {
            const user = userEvent.setup();
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const refreshButton = screen.getByText('🔄 Refresh Diagnostics');
            await user.click(refreshButton);

            expect(mockGetAllProducts).toHaveBeenCalledTimes(2);
        });

        it('should clear cache when Clear Cache button is clicked', async () => {
            const user = userEvent.setup();

            mockClearIndexedDbPersistence.mockResolvedValue(undefined);
            mockTerminate.mockResolvedValue(undefined);

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const clearButton = screen.getByText('🗑️ Clear Cache & Reload');
            await user.click(clearButton);

            expect(mockTerminate).toHaveBeenCalled();
            expect(mockClearIndexedDbPersistence).toHaveBeenCalled();
            expect(jest.getTimerCount()).toBeGreaterThan(0);

            // Fast-forward timer
            jest.advanceTimersByTime(1000);
        });

        it('should handle clear cache error', async () => {
            const user = userEvent.setup();
            const error = new Error('Clear cache failed');
            mockClearIndexedDbPersistence.mockRejectedValue(error);

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const clearButton = screen.getByText('🗑️ Clear Cache & Reload');
            await user.click(clearButton);

            await waitFor(() => {
                expect(console.error).toHaveBeenCalledWith('Error clearing cache:', error);
            });
        });
    });

    describe('Detailed Logs', () => {
        it('should display detailed console logs', async () => {
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('📜 Detailed Console Logs')).toBeInTheDocument();
                expect(screen.getByText(/🔍 Starting firebase_diagnostics/)).toBeInTheDocument();
                expect(screen.getByText(/📡 Method 1: Fetching via productService.getAllProducts/)).toBeInTheDocument();
                expect(screen.getByText(/📡 Method 2: Direct Firestore query/)).toBeInTheDocument();
            });
        });

        it('should add logs when discrepancies are detected', async () => {
            mockGetAllProducts.mockResolvedValue(mockProducts.slice(0, 2)); // Only 2 products

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText(/⚠️ DISCREPANCY DETECTED/)).toBeInTheDocument();
            });
        });
    });

    describe('Environment Configuration', () => {
        it('should display environment configuration', async () => {
            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('🔧 Environment Configuration')).toBeInTheDocument();
            });

            // Click to expand details
            const details = screen.getByText('🔧 Environment Configuration');
            await userEvent.click(details);

            await waitFor(() => {
                const configuration = screen.getByText(/NEXT_PUBLIC_FIREBASE_PROJECT_ID/);
                expect(configuration).toHaveTextContent('test-project-id');
                expect(configuration).toHaveTextContent('NEXT_PUBLIC_FIRESTORE_DATABASE_ID');
                expect(configuration).toHaveTextContent('(default)');
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error when diagnostics fail', async () => {
            const errorMessage = 'Network error occurred';
            mockGetAllProducts.mockRejectedValue(new Error(errorMessage));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('❌ Error Detected')).toBeInTheDocument();
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('should display error when Firestore query fails', async () => {
            const errorMessage = 'Firestore query failed';
            mockGetDocs.mockRejectedValue(new Error(errorMessage));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('❌ Error Detected')).toBeInTheDocument();
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('should handle real-time listener errors', async () => {
            const errorMessage = 'Listener error';
            mockOnSnapshot.mockImplementation((_collection, callback, errorCallback) => {
                errorCallback?.({ message: errorMessage } as FirestoreError);
                return jest.fn();
            });

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText(new RegExp(`❌ Real-time listener error: ${errorMessage}`)))
                    .toBeInTheDocument();
            });
        });
    });

    describe('Real-time Updates', () => {
        it('should update products in real-time', async () => {
            let realtimeCallback: ((snapshot: QuerySnapshot<DocumentData>) => void) | undefined;

            // Mock onSnapshot to capture the callback
            mockOnSnapshot.mockImplementation((_collection, callback) => {
                realtimeCallback = callback;
                // Initial call with initial products
                callback(productSnapshot(mockProducts));
                return jest.fn();
            });

            // Mock getAllProducts to return the updated list after real-time update
            let currentProducts = [...mockProducts];
            mockGetAllProducts.mockImplementation(() => {
                return Promise.resolve(currentProducts);
            });
            mockGetDocs.mockImplementation(() => Promise.resolve(productSnapshot(currentProducts)));

            render(<ProductListDiagnostics />);

            // Wait for initial render
            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(screen.getByText('Product 3')).toBeInTheDocument();
            });

            // Create new product
            const newProduct = {
                id: '4',
                name: 'Product 4',
                price: 39.99,
                description: 'New product',
                category: 'New Category',
                inStock: true,
            };

            // Add to current products for the mocks
            currentProducts = [...mockProducts, newProduct];

            // Trigger real-time update
            if (realtimeCallback) {
                realtimeCallback(productSnapshot(currentProducts));
            }

            // Advance timers to allow the component to process the update
            jest.advanceTimersByTime(200);

            // Wait for the new product to appear
            await waitFor(() => {
                expect(screen.getByText('Product 4')).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Loading States', () => {
        it('should show loading state while clearing cache', async () => {
            const user = userEvent.setup();
            mockClearIndexedDbPersistence.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 2000))
            );

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const clearButton = screen.getByText('🗑️ Clear Cache & Reload');
            await user.click(clearButton);

            expect(screen.getByText('⏳ Clearing...')).toBeInTheDocument();
            expect(clearButton).toBeDisabled();
        });

        it('should disable buttons during loading', async () => {
            render(<ProductListDiagnostics />);

            // Initially loading
            expect(screen.getByText('Running diagnostics...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('🔄 Refresh Diagnostics')).toBeEnabled();
                expect(screen.getByText('🗑️ Clear Cache & Reload')).toBeEnabled();
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty product list', async () => {
            mockGetAllProducts.mockResolvedValue([]);
            mockGetDocs.mockResolvedValue(productSnapshot([]));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('No products found in the database.')).toBeInTheDocument();
            });
        });

        it('should handle undefined product properties gracefully', async () => {
            const productsWithUndefinedProps = [
                {
                    id: '1',
                    name: 'Minimal Product',
                    price: 10,
                    inStock: true,
                },
            ] as Product[];

            mockGetAllProducts.mockResolvedValue(productsWithUndefinedProps);
            mockGetDocs.mockResolvedValue(productSnapshot(productsWithUndefinedProps));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Minimal Product')).toBeInTheDocument();
                // Use regex to find the text since it's part of a larger string
                expect(screen.getByText(/Category: N\/A/)).toBeInTheDocument();
            });
        });

        it('should handle malformed product data', async () => {
            const malformedProducts = [
                {
                    id: '1',
                    name: 'Product 1',
                    price: 29.99,
                },
            ] as Product[];

            mockGetAllProducts.mockResolvedValue(malformedProducts);
            mockGetDocs.mockResolvedValue(productSnapshot(malformedProducts));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                // Check that Category shows as N/A for missing category
                expect(screen.getByText(/Category: N\/A/)).toBeInTheDocument();
            });
        });

        it('should handle products with category but no description', async () => {
            const productsWithoutDescription = [
                {
                    id: '1',
                    name: 'Product Without Description',
                    price: 15.99,
                    category: 'Test Category',
                    inStock: true,
                },
            ] as Product[];

            mockGetAllProducts.mockResolvedValue(productsWithoutDescription);
            mockGetDocs.mockResolvedValue(productSnapshot(productsWithoutDescription));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product Without Description')).toBeInTheDocument();
                expect(screen.getByText(/Category: Test Category/)).toBeInTheDocument();
                // Description should not be rendered - use a more specific query
                const descriptionElement = screen.queryByText((_content, element) => {
                    // Check if the element is a description paragraph (has mt-1 class)
                    return Boolean(
                        element?.textContent?.includes('Description') &&
                        element.classList.contains('mt-1') &&
                        element.tagName === 'P'
                    );
                });
                expect(descriptionElement).not.toBeInTheDocument();
            });
        });

        it('should handle products with undefined inStock', async () => {
            const productsWithUndefinedStock = [
                {
                    id: '1',
                    name: 'Product with undefined stock',
                    price: 25.99,
                    category: 'Test Category',
                },
            ] as Product[];

            mockGetAllProducts.mockResolvedValue(productsWithUndefinedStock);
            mockGetDocs.mockResolvedValue(productSnapshot(productsWithUndefinedStock));

            render(<ProductListDiagnostics />);

            await waitFor(() => {
                expect(screen.getByText('Product with undefined stock')).toBeInTheDocument();
                // When inStock is undefined, it should show as ❌ (false)
                expect(screen.getByText(/In Stock: ❌/)).toBeInTheDocument();
            });
        });
    });

    describe('Cleanup', () => {
        it('should clean up real-time listener on unmount', () => {
            const mockUnsubscribe = jest.fn();
            mockOnSnapshot.mockReturnValue(mockUnsubscribe);

            const { unmount } = render(<ProductListDiagnostics />);
            unmount();

            expect(mockUnsubscribe).toHaveBeenCalled();
        });

        it('should clean up timers on unmount', () => {
            const { unmount } = render(<ProductListDiagnostics />);
            unmount();

            // Timer should be cleared
            expect(jest.getTimerCount()).toBe(0);
        });
    });
});
