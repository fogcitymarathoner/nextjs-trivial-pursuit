// components/__tests__/ProductFormModal.test.tsx

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductFormModal } from '../product/ProductFormModal';
import { Product } from '@/lib/firestore/productTypes';

// Mock the Product type for testing
const mockProduct: Product = {
    id: 'test-id-123',
    name: 'Test Product',
    price: 99.99,
    description: 'Test description',
    category: 'Electronics',
    inStock: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
};

// Mock console.error to prevent test noise
jest.spyOn(console, 'error').mockImplementation();

describe('ProductFormModal', () => {
    const mockOnClose = jest.fn();
    const mockOnSubmit = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should not render when isOpen is false', () => {
            render(
                <ProductFormModal
                    isOpen={false}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();
            expect(screen.queryByText('Product Name *')).not.toBeInTheDocument();
        });

        it('should render when isOpen is true', () => {
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            expect(screen.getByText('Add New Product')).toBeInTheDocument();
            expect(screen.getByText('Product Name *')).toBeInTheDocument();
            expect(screen.getByText('Price *')).toBeInTheDocument();
            expect(screen.getByText('Description')).toBeInTheDocument();
            expect(screen.getByText('Category')).toBeInTheDocument();
            expect(screen.getByText('In Stock')).toBeInTheDocument();
            expect(screen.getByText('Create Product')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should render with custom title and update button when editing', () => {
            const customTitle = 'Edit Product';
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={mockProduct}
                    title={customTitle}
                />
            );

            expect(screen.getByText(customTitle)).toBeInTheDocument();
            expect(screen.getByText('Update Product')).toBeInTheDocument();
        });

        it('should render with product data when editing', () => {
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={mockProduct}
                    title="Edit Product"
                />
            );

            expect(screen.getByDisplayValue(mockProduct.name)).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockProduct.price.toString())).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockProduct.description || '')).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockProduct.category || '')).toBeInTheDocument();
            expect(screen.getByText('Update Product')).toBeInTheDocument();
        });

        it('should show "In Stock" toggle as checked when product is in stock', () => {
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={mockProduct}
                />
            );

            const toggle = screen.getByRole('switch');
            expect(toggle).toHaveAttribute('aria-checked', 'true');
            expect(toggle).toHaveClass('bg-blue-600');
        });

        it('should show "In Stock" toggle as unchecked when product is out of stock', () => {
            const outOfStockProduct = { ...mockProduct, inStock: false };
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={outOfStockProduct}
                />
            );

            const toggle = screen.getByRole('switch');
            expect(toggle).toHaveAttribute('aria-checked', 'false');
            expect(toggle).toHaveClass('bg-gray-200');
        });
    });

    describe('Form Interactions', () => {
        it('should update form fields when user types', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');
            const descriptionInput = screen.getByLabelText('Description');
            const categoryInput = screen.getByLabelText('Category');

            await user.type(nameInput, 'New Product');
            await user.type(priceInput, '49.99');
            await user.type(descriptionInput, 'This is a test product');
            await user.type(categoryInput, 'Electronics');

            expect(nameInput).toHaveValue('New Product');
            expect(priceInput).toHaveValue(49.99);
            expect(descriptionInput).toHaveValue('This is a test product');
            expect(categoryInput).toHaveValue('Electronics');
        });

        it('should toggle In Stock when switch is clicked', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const toggle = screen.getByRole('switch');
            expect(toggle).toHaveAttribute('aria-checked', 'true');

            await user.click(toggle);
            expect(toggle).toHaveAttribute('aria-checked', 'false');

            await user.click(toggle);
            expect(toggle).toHaveAttribute('aria-checked', 'true');
        });

        it('should clear field errors when user types', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            // Submit empty form to trigger validation
            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            // Error should appear
            expect(screen.getByText('Product name is required')).toBeInTheDocument();

            // Type in the name field
            const nameInput = screen.getByLabelText('Product Name *');
            await user.type(nameInput, 'Test');

            // Error should disappear
            await waitFor(() => {
                expect(screen.queryByText('Product name is required')).not.toBeInTheDocument();
            });
        });
    });

    describe('Validation', () => {
        it('should show validation errors when submitting empty form', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            expect(screen.getByText('Product name is required')).toBeInTheDocument();
            expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('should show error when price is zero', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            // Set price to 0 by clearing and typing 0
            await user.clear(priceInput);
            await user.type(priceInput, '0');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should show error when price is negative', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');

            // Use fireEvent to set the value directly
            // This will update the React state via the onChange handler
            fireEvent.change(priceInput, { target: { value: '-10' } });

            // Verify the value was set in the DOM
            expect(priceInput).toHaveValue(-10);

            // Now submit the form by directly calling the submit event
            // This ensures the form validation runs
            const form = priceInput.closest('form');
            expect(form).not.toBeNull();

            if (form) {
                fireEvent.submit(form);
            }

            // Wait for the error message to appear
            await waitFor(() => {
                const errorElement = screen.queryByText('Price must be greater than 0');
                expect(errorElement).toBeInTheDocument();
            });
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should show error when price exceeds maximum', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.clear(priceInput);
            await user.type(priceInput, '9999999');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            expect(screen.getByText('Price must be less than 1,000,000')).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should show error when category exceeds max length', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');
            const categoryInput = screen.getByLabelText('Category');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '50');
            await user.type(categoryInput, 'A'.repeat(51));

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            expect(screen.getByText('Category must be less than 50 characters')).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should submit form when validation passes', async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue(undefined);

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith({
                    name: 'Test Product',
                    price: 99.99,
                    description: '',
                    category: '',
                    inStock: true,
                });
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe('Form Submission', () => {
        it('should show loading state during submission', async () => {
            const user = userEvent.setup();
            let resolveSubmit: () => void;
            const submitPromise = new Promise<void>((resolve) => {
                resolveSubmit = resolve;
            });
            mockOnSubmit.mockImplementation(() => submitPromise);

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            // Should show loading state
            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(submitButton).toBeDisabled();

            // Resolve the submission
            resolveSubmit!();
            await waitFor(() => {
                expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
            });
        });

        it('should handle submission error', async () => {
            const user = userEvent.setup();
            const errorMessage = 'Network error occurred';
            mockOnSubmit.mockRejectedValue(new Error(errorMessage));

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
                expect(mockOnClose).not.toHaveBeenCalled();
            });
        });

        it('should handle non-Error submission error', async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockRejectedValue('String error');

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to save product')).toBeInTheDocument();
                expect(mockOnClose).not.toHaveBeenCalled();
            });
        });

        it('should not submit if already submitting', async () => {
            const user = userEvent.setup();
            let resolveSubmit: () => void;
            const submitPromise = new Promise<void>((resolve) => {
                resolveSubmit = resolve;
            });
            mockOnSubmit.mockImplementation(() => submitPromise);

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            // Try to submit again while loading
            await user.click(submitButton);

            // Should only be called once
            expect(mockOnSubmit).toHaveBeenCalledTimes(1);

            // Resolve the submission
            resolveSubmit!();
        });
    });

    describe('Modal Controls', () => {
        it('should close modal when Cancel button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalled();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should close modal when backdrop is clicked', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            // Find the backdrop by its class
            const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
            expect(backdrop).toBeInTheDocument();

            if (backdrop) {
                await user.click(backdrop);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });

        it('should close modal when close button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const closeButton = screen.getByRole('button', { name: 'Close' });
            await user.click(closeButton);

            expect(mockOnClose).toHaveBeenCalled();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should not close when clicking inside modal', async () => {
            const user = userEvent.setup();
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const modalContent = screen.getByText('Add New Product').closest('.relative');
            if (modalContent) {
                await user.click(modalContent);
                expect(mockOnClose).not.toHaveBeenCalled();
            }
        });

        it('should not close when submitting and Cancel is disabled', async () => {
            const user = userEvent.setup();
            let resolveSubmit: () => void;
            const submitPromise = new Promise<void>((resolve) => {
                resolveSubmit = resolve;
            });
            mockOnSubmit.mockImplementation(() => submitPromise);

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            const cancelButton = screen.getByText('Cancel');
            expect(cancelButton).toBeDisabled();

            resolveSubmit!();
        });
    });

    describe('Form Reset', () => {
        it('should reset form when isOpen becomes true', () => {
            const { rerender } = render(
                <ProductFormModal
                    isOpen={false}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();

            rerender(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            expect(screen.getByText('Add New Product')).toBeInTheDocument();
            const nameInput = screen.getByLabelText('Product Name *');
            expect(nameInput).toHaveValue('');
        });

        it('should reset form when product changes', () => {
            const { rerender } = render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={mockProduct}
                />
            );

            expect(screen.getByDisplayValue(mockProduct.name)).toBeInTheDocument();

            const newProduct = { ...mockProduct, name: 'New Name' };
            rerender(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={newProduct}
                />
            );

            expect(screen.getByDisplayValue('New Name')).toBeInTheDocument();
        });

        it('should clear errors when modal reopens', async () => {
            const user = userEvent.setup();
            const { rerender } = render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            expect(screen.getByText('Product name is required')).toBeInTheDocument();

            rerender(
                <ProductFormModal
                    isOpen={false}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            rerender(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            expect(screen.queryByText('Product name is required')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have correct ARIA attributes', () => {
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const toggle = screen.getByRole('switch');
            expect(toggle).toHaveAttribute('role', 'switch');
            expect(toggle).toHaveAttribute('aria-checked', 'true');
        });

        it('should auto-focus the name input when modal opens', async () => {
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            await waitFor(() => {
                const nameInput = screen.getByLabelText('Product Name *');
                expect(nameInput).toHaveFocus();
            });
        });

        it('should have accessible close button with sr-only label', () => {
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const closeButton = screen.getByRole('button', { name: 'Close' });
            expect(closeButton).toBeInTheDocument();

            const srOnlySpan = closeButton.querySelector('.sr-only');
            expect(srOnlySpan).toHaveTextContent('Close');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty product description', () => {
            const productWithoutDescription = { ...mockProduct, description: undefined };
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={productWithoutDescription}
                />
            );

            const descriptionInput = screen.getByLabelText('Description');
            expect(descriptionInput).toHaveValue('');
        });

        it('should handle empty product category', () => {
            const productWithoutCategory = { ...mockProduct, category: undefined };
            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                    product={productWithoutCategory}
                />
            );

            const categoryInput = screen.getByLabelText('Category');
            expect(categoryInput).toHaveValue('');
        });

        it('should handle price with decimal places', async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue(undefined);

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith(
                    expect.objectContaining({
                        price: 99.99,
                    })
                );
            });
        });

        it('should handle rapid form submission attempts', async () => {
            const user = userEvent.setup();
            let resolveSubmit: () => void;
            const submitPromise = new Promise<void>((resolve) => {
                resolveSubmit = resolve;
            });
            mockOnSubmit.mockImplementation(() => submitPromise);

            render(
                <ProductFormModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onSubmit={mockOnSubmit}
                />
            );

            const nameInput = screen.getByLabelText('Product Name *');
            const priceInput = screen.getByLabelText('Price *');

            await user.type(nameInput, 'Test Product');
            await user.type(priceInput, '99.99');

            const submitButton = screen.getByText('Create Product');

            await user.click(submitButton);
            await user.click(submitButton);
            await user.click(submitButton);

            expect(mockOnSubmit).toHaveBeenCalledTimes(1);

            resolveSubmit!();
        });
    });
});