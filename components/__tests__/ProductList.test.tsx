// components/__tests__/ProductList.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductList } from '../product/ProductList';
import { productService } from '../../lib/firestore/productService';
import { Product } from '../../lib/firestore/productTypes';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

type ProductFormModalProps = React.ComponentProps<
    (typeof import('../product/ProductFormModal'))['ProductFormModal']
>;

// ProductList only needs an app handle and auth state. Keep unit tests isolated
// from the real Firebase client, which validates environment configuration when
// its module is loaded.
jest.mock('@/lib/firebase/client', () => ({
    app: { name: 'test-app' },
}));

jest.mock('firebase/auth', () => {
    return {
        getAuth: jest.fn(),
        onAuthStateChanged: jest.fn(),
    };
});

const configureAuthMocks = () => {
    const currentUser = { uid: 'test-user' } as User;
    jest.mocked(getAuth).mockReturnValue({ currentUser } as ReturnType<typeof getAuth>);
    jest.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
        if (typeof callback === 'function') {
            callback(currentUser);
        } else {
            callback.next(currentUser);
        }
        return jest.fn();
    });
};

// Mock the product service
jest.mock('../../lib/firestore/productService', () => ({
    productService: {
        getAllProducts: jest.fn(),
        createProduct: jest.fn(),
        updateProduct: jest.fn(),
        deleteProduct: jest.fn(),
        getProductById: jest.fn(),
    },
}));

// Mock the ProductFormModal to control submission
jest.mock('../product/ProductFormModal', () => ({
    ProductFormModal: ({ isOpen, onClose, onSubmit, product, title }: ProductFormModalProps) => {
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        if (!isOpen) return null;

        return (
            <div data-testid="product-modal">
                <h2>{title}</h2>
                <button
                    onClick={async () => {
                        if (isSubmitting) return;
                        setIsSubmitting(true);
                        try {
                            await onSubmit({
                                name: 'New Test Product',
                                price: 99.99,
                                description: 'Test description',
                                category: 'Test Category',
                                inStock: true,
                            });
                            onClose();
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                    data-testid="modal-submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
                <button onClick={onClose} data-testid="modal-close">Close</button>
                {product && <div data-testid="edit-product-id">{product.id}</div>}
            </div>
        );
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
        configureAuthMocks();
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

            expect(screen.getByText('Loading products…')).toBeInTheDocument();
            expect(screen.getByText('Loading products…').previousSibling).toHaveClass('app-loading-spinner');
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
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(screen.getByText('Product 2')).toBeInTheDocument();
                expect(screen.getByText('Product 3')).toBeInTheDocument();
                expect(screen.getByText('$29.99')).toBeInTheDocument();
                expect(screen.getByText('$49.99')).toBeInTheDocument();
                expect(screen.getByText('$19.99')).toBeInTheDocument();
                expect(screen.getByText('Description 1')).toBeInTheDocument();
                expect(screen.getByText('Description 2')).toBeInTheDocument();
                expect(screen.getByText('Description 3')).toBeInTheDocument();
            });
        });

        it('should show "No products" message when product list is empty', async () => {
            mockProductService.getAllProducts.mockResolvedValue([]);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/No products available\. Click "Add Product" to create one\./)).toBeInTheDocument();
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
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('should display generic error message for non-Error exceptions', async () => {
            mockProductService.getAllProducts.mockRejectedValue('String error');

            render(<ProductList />);

            await waitFor(() => {
                // The component renders "Failed to load products" without "Error:" prefix
                // for non-Error exceptions
                expect(screen.getByText('Failed to load products')).toBeInTheDocument();
            });
        });

        it('should display generic error for null exceptions', async () => {
            mockProductService.getAllProducts.mockRejectedValue(null);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load products')).toBeInTheDocument();
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

            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });

            const retryButton = screen.getByText('Retry');
            await user.click(retryButton);

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

            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
            });

            const retryButton = screen.getByText('Retry');
            await user.click(retryButton);

            await waitFor(() => {
                expect(screen.getByText('Retry')).toBeInTheDocument();
                expect(screen.getByText('Persistent error')).toBeInTheDocument();
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

    describe('Adding Products with Modal', () => {
        it('should open modal when Add Product button is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByTestId('product-modal')).toBeInTheDocument();
                expect(screen.getByText('Add New Product')).toBeInTheDocument();
            });
        });

        it('should create product when modal submits', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.createProduct.mockResolvedValue('new-id');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByTestId('product-modal')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('modal-submit');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: 'New Test Product',
                        price: 99.99,
                        description: 'Test description',
                        category: 'Test Category',
                        inStock: true,
                    })
                );
                expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(2);
            });
        });

        it('should close modal when cancel is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByTestId('product-modal')).toBeInTheDocument();
            });

            const closeButton = screen.getByTestId('modal-close');
            await user.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByTestId('product-modal')).not.toBeInTheDocument();
            });
        });

        it('should prevent duplicate product creation from rapid clicks', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.createProduct.mockResolvedValue('new-id');

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const addButton = screen.getByText('Add Product');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByTestId('product-modal')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('modal-submit');

            await user.click(submitButton);
            await user.click(submitButton);
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockProductService.createProduct).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Editing Products', () => {
        it('should open edit modal when Edit button is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByText('✏️ Edit');
            await user.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('product-modal')).toBeInTheDocument();
                expect(screen.getByText('Edit Product')).toBeInTheDocument();
            });
        });

        it('should update product when modal submits with edits', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.updateProduct.mockResolvedValue(undefined);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByText('✏️ Edit');
            await user.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('product-modal')).toBeInTheDocument();
            });

            const submitButton = screen.getByTestId('modal-submit');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockProductService.updateProduct).toHaveBeenCalledWith(
                    '1',
                    expect.objectContaining({
                        name: 'New Test Product',
                        price: 99.99,
                    })
                );
            });
        });
    });

    describe('Deleting Products', () => {
        it('should delete product when Delete button is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.deleteProduct.mockResolvedValue(undefined);

            window.confirm = jest.fn(() => true);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('🗑️ Delete');
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(window.confirm).toHaveBeenCalled();
                expect(mockProductService.deleteProduct).toHaveBeenCalledWith('1');
                expect(mockProductService.getAllProducts).toHaveBeenCalledTimes(2);
            });
        });

        it('should not delete product if user cancels confirmation', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.deleteProduct.mockResolvedValue(undefined);

            window.confirm = jest.fn(() => false);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('🗑️ Delete');
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(window.confirm).toHaveBeenCalled();
                expect(mockProductService.deleteProduct).not.toHaveBeenCalled();
            });
        });

        it('should handle delete error', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.deleteProduct.mockRejectedValue(new Error('Delete failed'));

            window.confirm = jest.fn(() => true);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('🗑️ Delete');
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Failed to delete product')).toBeInTheDocument();
            });
        });
    });

    describe('Quick Edit (Inline)', () => {
        it('should enter inline edit mode when Quick Edit is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const quickEditButtons = screen.getAllByText('✏️ Quick Edit');
            await user.click(quickEditButtons[0]);

            await waitFor(() => {
                expect(screen.getByDisplayValue('Product 1')).toBeInTheDocument();
                expect(screen.getByDisplayValue('29.99')).toBeInTheDocument();
                expect(screen.getByDisplayValue('Description 1')).toBeInTheDocument();
            });

            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should save inline edit when Save is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.updateProduct.mockResolvedValue(undefined);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const quickEditButtons = screen.getAllByText('✏️ Quick Edit');
            await user.click(quickEditButtons[0]);

            await waitFor(() => {
                expect(screen.getByDisplayValue('Product 1')).toBeInTheDocument();
            });

            const nameInput = screen.getByDisplayValue('Product 1');
            await user.clear(nameInput);
            await user.type(nameInput, 'Updated Product Name');

            const saveButton = screen.getByText('Save');
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockProductService.updateProduct).toHaveBeenCalledWith(
                    '1',
                    expect.objectContaining({
                        name: 'Updated Product Name',
                    })
                );
            });
        });

        it('should cancel inline edit when Cancel is clicked', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const quickEditButtons = screen.getAllByText('✏️ Quick Edit');
            await user.click(quickEditButtons[0]);

            await waitFor(() => {
                expect(screen.getByDisplayValue('Product 1')).toBeInTheDocument();
            });

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
                expect(mockProductService.updateProduct).not.toHaveBeenCalled();
            });
        });
    });

    describe('Authentication', () => {
        it('should display auth status', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText(/🔐 Auth Status:/)).toBeInTheDocument();
                expect(screen.getByText(/✅ Authenticated/)).toBeInTheDocument();
            });
        });
    });

    describe('Product Display Variants', () => {
        it('should display "In Stock" badge for available products', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                const inStockBadges = screen.getAllByText('In Stock', { selector: 'span.app-badge-stock' });
                expect(inStockBadges).toHaveLength(2);
            });
        });

        it('should display "Out of Stock" badge for unavailable products', async () => {
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);

            render(<ProductList />);

            await waitFor(() => {
                const outOfStockBadges = screen.getAllByText('Out of Stock', { selector: 'span.app-badge-out-of-stock' });
                expect(outOfStockBadges).toHaveLength(1);
            });
        });

        it('should display category or em dash when category is missing', async () => {
            const productsWithoutCategory = [
                {
                    ...mockProducts[0],
                    category: undefined,
                }
            ];
            mockProductService.getAllProducts.mockResolvedValue(productsWithoutCategory as Product[]);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('—')).toBeInTheDocument();
            });
        });
    });

    describe('Loading States', () => {
        it('should show loading spinner while fetching products', () => {
            mockProductService.getAllProducts.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockProducts), 1000))
            );

            render(<ProductList />);

            expect(screen.getByText('Loading products…')).toBeInTheDocument();
            const spinner = screen.getByText('Loading products…').previousSibling;
            expect(spinner).toHaveClass('app-loading-spinner');
        });

        it('should show loading state while deleting', async () => {
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            mockProductService.getAllProducts.mockResolvedValue(mockProducts);
            mockProductService.deleteProduct.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 1000))
            );
            window.confirm = jest.fn(() => true);

            render(<ProductList />);

            await waitFor(() => {
                expect(screen.getByText('Product 1')).toBeInTheDocument();
            });

            const deleteButtons = screen.getAllByText('🗑️ Delete');
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Deleting...')).toBeInTheDocument();
            });
        });
    });
});
