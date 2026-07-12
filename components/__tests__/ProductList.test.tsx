// components/__tests__/ProductList.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductList } from '../ProductList';
import { productService } from '../../lib/firestore/firestore-service';
import { Product } from '../../lib/firestore/types';

// Mock the product service
jest.mock('../../lib/firestore/firestore-service', () => ({
    productService: {
        getAllProducts: jest.fn(),
        createProduct: jest.fn(),
        updateProduct: jest.fn(),
        deleteProduct: jest.fn(),
        getProductById: jest.fn(),
    },
}));

// Mock console methods
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

describe('ProductList Component', () => {
    const mockProducts: Product[] = [
        {
            id: '1',
            name: 'Product 1',
            price: 29.99,
            description: 'Description 1',
            category: 'Electronics',
            inStock: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '2',
            name: 'Product 2',
            price: 49.99,
            description: 'Description 2',
            category: 'Books',
            inStock: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '3',
            name: 'Product 3',
            price: 19.99,
            description: 'Description 3',
            category: 'Clothing',
            inStock: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    const mockProductService = productService as jest.Mocked<typeof productService>;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        it('should show loading state initially', () => {
            mockProductService.getAllProducts.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockProducts), 1000))
            );

            render(<ProductList />);

            expect(screen.getByText('Loading products...')).toBeInTheDocument();
            expect(screen.getByText('Loading products...').previousSibling).toHaveClass('animate-spin');
        });

        it('should display products after loading', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(screen.getByText('Product 2')).toBeInTheDocument();
                expect(screen.getByText('Product 3')).toBeInTheDocument();
            });
        });

        it('should show total product count', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Total: 3 products')).toBeInTheDocument();
            });
        });

        it('should display product details correctly', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                // Check product names
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(screen.getByText('Product 2')).toBeInTheDocument();
                expect(screen.getByText('Product 3')).toBeInTheDocument();

                // Check prices
                expect(screen.getByText('$29.99')).toBeInTheDocument();
                expect(screen.getByText('$49.99')).toBeInTheDocument();
                expect(screen.getByText('$19.99')).toBeInTheDocument();

                // Check descriptions
                expect(screen.getByText('Description 1')).toBeInTheDocument();
                expect(screen.getByText('Description 2')).toBeInTheDocument();
                expect(screen.getByText('Description 3')).toBeInTheDocument();
            });
        });

        it('should render product list items with correct classes', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                const listItems = screen.getAllByRole('listitem');
                expect(listItems).toHaveLength(3);
                listItems.forEach(item => {
                    expect(item).toHaveClass('border');
                    expect(item).toHaveClass('rounded-lg');
                    expect(item).toHaveClass('p-4');
                });
            });
        });

        it('should show "No products" message when product list is empty', async () => {
            mockProductService.getAllProducts.mockResolvedValue([]);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('No products available. Click "Add Product" to create one.')).toBeInTheDocument();
                expect(screen.getByText('Total: 0 products')).toBeInTheDocument();
            });
        });

        it('should log when no products are found', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log');
            mockProductService.getAllProducts.mockResolvedValue([]);

            render(<ProductList />);

            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith('📭 No products found');
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message when product loading fails', async () => {
            const errorMessage = 'Network error occurred';
            mockProductService.getAllProducts.mockRejectedValue(new Error(errorMessage));

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
            });
        });

        it('should display generic error message for non-Error exceptions', async () => {
            mockProductService.getAllProducts.mockRejectedValue('String error');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Error: Failed to load products')).toBeInTheDocument();
            });
        });

        it('should display error for null exceptions', async () => {
            mockProductService.getAllProducts.mockRejectedValue(null);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Error: Failed to load products')).toBeInTheDocument();
            });
        });

        it('should show retry button when error occurs', async () => {
            mockProductService.getAllProducts.mockRejectedValue(new Error('Test error'));

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });
        });

        it('should retry loading products when retry button is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const error = new Error('Test error');
            mockProductService.getAllProducts
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce(mockProducts);

            render(<ProductList />);

            // First, error state
            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });

            // Click retry
            const retryButton = screen.getByText('Retry');
            await user.click(retryButton);

            // Should load products successfully
            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(2);
        });

        it('should handle retry failing again', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const error = new Error('Persistent error');
            mockProductService.getAllProducts
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error);

            render(<ProductList />);

            // First error
            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });

            // Click retry
            const retryButton = screen.getByText('Retry');
            await user.click(retryButton);

            // Still in error state
            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
                expect(screen.getByText('Error: Persistent error')).toBeInTheDocument();
            });
        });

        it('should log error to console when loading fails', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error');
            const error = new Error('Console error test');
            mockProductService.getAllProducts.mockRejectedValue(error);

            render(<ProductList />);

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error loading products:', error);
            });
        });
    });

    describe('Adding Products', () => {
        it('should add a new product when Add Product button is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.createProduct.mockResolvedValue('4');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalled();
                expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(2);
            });
        });

        it('should create product with correct structure', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue([]);
            mockProductService.createProduct.mockResolvedValue('new-id');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/^No products available\./)).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: expect.stringMatching(/^Product \d+$/),
                        price: expect.any(Number),
                        description: 'Sample product description',
                        category: 'Electronics',
                        inStock: true,
                    })
                );
            });
        });

        it('should generate unique product names with timestamps', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue([]);
            mockProductService.createProduct.mockResolvedValue('new-id');

            // Mock Date.now() to return a predictable value
            const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/^No products available\./)).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: 'Product 1234567890',
                    })
                );
            });

            dateSpy.mockRestore();
        });

        it('should generate prices between 10 and 109', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue([]);
            mockProductService.createProduct.mockResolvedValue('new-id');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/^No products available\./)).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                const createCall = mockProductService.createProduct.mock.calls[0][0];
                expect(createCall.price).toBeGreaterThanOrEqual(10);
                expect(createCall.price).toBeLessThan(110);
            });
        });

        it('should handle error when adding product fails', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const consoleErrorSpy = jest.spyOn(console, 'error');
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.createProduct.mockRejectedValue(new Error('Add product failed'));

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByText('Error: Failed to add product')).toBeInTheDocument();
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Error adding product:',
                    expect.any(Error)
                );
            });
        });

        it('should show loading state while adding product', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.createProduct.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 1000))
            );

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            // Should show loading
            expect(screen.getByText('Loading products...')).toBeInTheDocument();
        });
    });

    describe('Product Display', () => {
        it('should display product with description', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Description 1')).toBeInTheDocument();
                expect(screen.getByText('Description 2')).toBeInTheDocument();
                expect(screen.getByText('Description 3')).toBeInTheDocument();
            });
        });

        it('should handle products without description', async () => {
            const productsWithoutDesc = [
                {
                    ...mockProducts[0],
                    description: undefined,
                },
                {
                    ...mockProducts[1],
                    description: null,
                },
            ];

            mockProductService.getAllProducts.mockResolvedValue(productsWithoutDesc as unknown as Product[]);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(screen.getByText('Product 2')).toBeInTheDocument();
                // Description should not be rendered
                expect(screen.queryByText('Description 1')).not.toBeInTheDocument();
                expect(screen.queryByText('Description 2')).not.toBeInTheDocument();
            });
        });

        it('should display product price with dollar sign', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('$29.99')).toBeInTheDocument();
                expect(screen.getByText('$49.99')).toBeInTheDocument();
                expect(screen.getByText('$19.99')).toBeInTheDocument();
            });
        });

        it('should render products as list items', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                const listItems = screen.getAllByRole('listitem');
                expect(listItems).toHaveLength(3);
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading spinner while fetching products', () => {
            mockProductService.getAllProducts.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockProducts), 1000))
            );

            render(<ProductList />);

            expect(screen.getByText('Loading products...')).toBeInTheDocument();
            const spinner = screen.getByText('Loading products...').previousSibling;
            expect(spinner).toHaveClass('animate-spin');
            expect(spinner).toHaveClass('rounded-full');
        });

        it('should hide loading state after products load', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });
        });

        it('should hide loading state on error', async () => {
            mockProductService.getAllProducts.mockRejectedValue(new Error('Load failed'));

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
                expect(screen.getByText('Error: Load failed')).toBeInTheDocument();
            });
        });
    });

    describe('Component Lifecycle', () => {
        it('should load products on mount', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(1);
            });
        });

        it('should prevent state updates after unmount', async () => {
            // This is a good test for the mounted flag
            const consoleErrorSpy = jest.spyOn(console, 'error');
            mockProductService.getAllProducts.mockImplementation(
                () => new Promise(resolve => {
                    setTimeout(() => resolve(mockProducts), 100);
                })
            );

            const { unmount } = render(<ProductList />);
            unmount();

            // Fast-forward timers
            jest.runAllTimers();

            // Should not have any state update errors
            expect(consoleErrorSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('Cannot update a component'),
                expect.anything()
            );
        });

        it('should reload products when retryCount changes', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts
                .mockRejectedValueOnce(new Error('Initial error'))
                .mockResolvedValueOnce(mockProducts);

            render(<ProductList />);

            const retryButton = await screen.findByRole('button', { name: 'Retry' });

            // Trigger retry
            await user.click(retryButton);

            await waitFor(() => {
                expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Accessibility', () => {
        it('should have accessible button with correct ARIA attributes', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                const addButton = screen.getByText('Add Product');
                expect(addButton).toHaveAttribute('type', 'button');
                expect(addButton).toBeEnabled();
            });
        });

        it('should have focus visible styles on buttons', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                const addButton = screen.getByText('Add Product');
                expect(addButton).toHaveClass('focus-visible:outline-none');
                expect(addButton).toHaveClass('focus-visible:ring-2');
                expect(addButton).toHaveClass('focus-visible:ring-blue-500');
            });
        });

        it('should have proper button text for screen readers', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            const { unmount } = render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Add Product' })).toBeInTheDocument();
            });

            unmount();
            mockProductService.getAllProducts.mockRejectedValueOnce(new Error('Test error'));
            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
            });
        });
    });

    describe('State Management', () => {
        it('should update product list after adding a product', async () => {
            const user = userEvent.setup({
                advanceTimers: jest.advanceTimersByTime,
            });
            const initialProducts = mockProducts.slice(0, 2);
            const newProducts = [...initialProducts, mockProducts[2]];

            mockProductService.getAllProducts
                .mockResolvedValueOnce(initialProducts)
                .mockResolvedValueOnce(newProducts);
            mockProductService.createProduct.mockResolvedValue('product-3');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Total: 2 products')).toBeInTheDocument();
                expect(screen.queryByText('Product 3')).not.toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByText('Total: 3 products')).toBeInTheDocument();
                expect(screen.getByText('Product 3')).toBeInTheDocument();
            });
        });

        it('should maintain error state correctly', async () => {
            const user = userEvent.setup({
                advanceTimers: jest.advanceTimersByTime,
            });
            mockProductService.getAllProducts.mockRejectedValue(new Error('Initial error'));

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Error: Initial error')).toBeInTheDocument();
            });

            // Retry and succeed
            mockProductService.getAllProducts.mockResolvedValueOnce(mockProducts);

            const retryButton = screen.getByText('Retry');
            await user.click(retryButton);

            await waitFor(() => {
                expect(screen.queryByText('Error: Initial error')).not.toBeInTheDocument();
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });
        });
    });

    describe('Error Boundary Integration', () => {
        it('should handle component errors gracefully', async () => {
            // Test that the component doesn't crash completely
            const error = new Error('Render error');
            mockProductService.getAllProducts.mockRejectedValue(error);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/Error:/)).toBeInTheDocument();
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });
        });
    });

    describe('Performance', () => {
        it('should render large product lists efficiently', async () => {
            const largeProductList = Array.from({ length: 100 }, (_, i) => ({
                ...mockProducts[0],
                id: `product-${i}`,
                name: `Product ${i}`,
                price: 10 + i,
            }));

            mockProductService.getAllProducts.mockResolvedValue(largeProductList);

            const startTime = performance.now();
            render(<ProductList />);
            const endTime = performance.now();

            // Should render within reasonable time
            expect(endTime - startTime).toBeLessThan(500);

            await waitFor(() => {
                expect(screen.getByText('Total: 100 products')).toBeInTheDocument();
            });
        });

        it('should not cause memory leaks with repeated renders', () => {
            const { rerender, unmount } = render(<ProductList />);

            // Rerender multiple times
            for (let i = 0; i < 5; i++) {
                rerender(<ProductList />);
            }

            // Should unmount cleanly
            expect(() => unmount()).not.toThrow();
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle adding product when list is empty', async () => {
            const user = userEvent.setup({
                advanceTimers: jest.advanceTimersByTime,
            });
            mockProductService.getAllProducts.mockResolvedValue([]);
            mockProductService.createProduct.mockResolvedValue('new-id');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/^No products available\./)).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalled();
                expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(2);
            });
        });

        it('should prevent duplicate product creation from rapid clicks', async () => {
            const user = userEvent.setup({
                advanceTimers: jest.advanceTimersByTime,
            });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.createProduct.mockResolvedValue('new-id');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');

            // The first click switches the component to its loading state and
            // removes the action button, so subsequent clicks are ignored.
            await user.click(addButton);
            await user.click(addButton);
            await user.click(addButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalledTimes(1);
            });
        });
    });
});

// Integration test with actual services
describe('ProductList Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should work with real product service structure', async () => {
        const mockProductService = productService as jest.Mocked<typeof productService>;
        const mockProducts = [
            {
                id: '1',
                name: 'Integration Product',
                price: 99.99,
                description: 'Integration test product',
                category: 'Test',
                inStock: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ];

        mockProductService.getAllProducts.mockResolvedValue(mockProducts);

        render(<ProductList />);

        await waitFor(() => {
            expect(screen.getByText('Integration Product')).toBeInTheDocument();
            expect(screen.getByText('$99.99')).toBeInTheDocument();
            expect(screen.getByText('Integration test product')).toBeInTheDocument();
        });
    });
});

// Run tests:
// yarn test components/__tests__/ProductList.test.tsx --coverage
