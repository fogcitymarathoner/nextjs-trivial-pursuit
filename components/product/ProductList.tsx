// components/ProductList.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { productService } from '../../lib/firestore/productService';
import { Product } from '../../lib/firestore/productTypes';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase/client';
import { ProductFormModal } from './ProductFormModal';
import type { ProductInput, ProductListTestAdapter } from './productListTestAdapter';

const getTestAdapter = (): ProductListTestAdapter | undefined => process.env.NODE_ENV !== 'production'
    ? window.__PRODUCT_LIST_TEST_ADAPTER__
    : undefined;

export const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [authStatus, setAuthStatus] = useState<string>(() => {
        const testAdapter = getTestAdapter();
        if (!testAdapter) return 'Checking...';
        return testAdapter.authUserId
            ? `âœ… Authenticated (${testAdapter.authUserId})`
            : 'âŒ Not authenticated';
    });
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<Partial<Product>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Check authentication status
    useEffect(() => {
        const testAdapter = getTestAdapter();
        if (testAdapter) {
            return;
        }

        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthStatus(`✅ Authenticated (${user.uid})`);
                console.log('✅ User is authenticated:', user.uid);
            } else {
                setAuthStatus('❌ Not authenticated');
                console.log('❌ User is NOT authenticated');
            }
        });
        return () => unsubscribe();
    }, []);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔄 Loading products...');

            const data = await (getTestAdapter()?.getAllProducts()
                ?? productService.getAllProducts());
            setProducts(data);

            if (data.length === 0) {
                console.log('📭 No products found');
            }
        } catch (err) {
            console.error('❌ Error loading products:', err);
            setError(err instanceof Error ? err.message : 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!mounted) return;
            await loadProducts();
        };

        load();

        return () => {
            mounted = false;
        };
    }, [loadProducts, retryCount]);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
    };

    const requireAuth = (action: string) => {
        const testAdapter = getTestAdapter();
        if (testAdapter) {
            if (!testAdapter.authUserId) {
                setError(`You must be logged in to ${action}`);
                return false;
            }
            return true;
        }

        const auth = getAuth(app);
        if (!auth.currentUser) {
            setError(`You must be logged in to ${action}`);
            return false;
        }
        return true;
    };

    // Modal handlers
    const handleOpenAddModal = () => {
        if (!requireAuth('add products')) return;
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (product: Product) => {
        if (!requireAuth('edit products')) return;
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setError(null);
    };

    const handleModalSubmit = async (productData: ProductInput) => {
        try {
            if (editingProduct) {
                // Update existing product
                await (getTestAdapter()?.updateProduct(editingProduct.id!, productData)
                    ?? productService.updateProduct(editingProduct.id!, productData));
                console.log('✅ Product updated successfully');
            } else {
                // Create new product
                await (getTestAdapter()?.createProduct(productData)
                    ?? productService.createProduct(productData));
                console.log('✅ Product created successfully');
            }
            await loadProducts();
        } catch (error) {
            console.error('❌ Error saving product:', error);
            throw new Error('Failed to save product');
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!requireAuth('delete products')) return;

        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            setDeletingId(productId);
            setError(null);
            console.log(`🗑️ Deleting product: ${productId}`);

            await (getTestAdapter()?.deleteProduct(productId)
                ?? productService.deleteProduct(productId));
            await loadProducts();

            console.log('✅ Product deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            setError('Failed to delete product');
        } finally {
            setDeletingId(null);
        }
    };

    // Inline edit handlers (keep for quick edits)
    const startInlineEditing = (product: Product) => {
        setEditingId(product.id!);
        setEditDraft({
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            inStock: product.inStock,
        });
    };

    const cancelInlineEditing = () => {
        setEditingId(null);
        setEditDraft({});
    };

    const handleInlineSave = async (productId: string) => {
        if (!requireAuth('edit products')) return;

        try {
            setSavingId(productId);
            setError(null);
            await (getTestAdapter()?.updateProduct(productId, editDraft)
                ?? productService.updateProduct(productId, editDraft));
            await loadProducts();
            setEditingId(null);
            setEditDraft({});
        } catch (error) {
            console.error('❌ Error updating product:', error);
            setError('Failed to update product');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="app-loading-state">
                <div className="app-loading-spinner" aria-hidden="true" />
                <p className="app-body-copy-muted">Loading products…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-status-message app-status-message-danger">
                <p>{error}</p>
                <button
                    type="button"
                    onClick={handleRetry}
                    className="app-button-primary mt-4"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="app-content-stack">
                {/* Auth Status Display */}
                <div className="app-status-message">
                    <span className="app-body-copy">🔐 Auth Status:</span>
                    <span className={`app-body-copy ${authStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                        {authStatus}
                    </span>
                </div>

                <div className="app-action-row">

                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="app-button-primary inline-flex items-center gap-2"
                    >
                        <svg
                            className="w-4 h-4 opacity-60"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </button>
                    <span className="app-body-copy-muted">
                        Total: {products.length} products
                    </span>
                </div>

                {products.length === 0 ? (
                    <p className="app-body-copy-muted">No products available. Click &quot;Add Product&quot; to create one.</p>
                ) : (
                    <div className="overflow-x-auto surface-panel">
                        <table className="app-table">
                            <thead className="app-table-head">
                            <tr>
                                <th className="app-table-header">Name</th>
                                <th className="app-table-header">Price</th>
                                <th className="app-table-header">Category</th>
                                <th className="app-table-header">In Stock</th>
                                <th className="app-table-header app-table-header-actions">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {products.map((product) => {
                                const isEditing = editingId === product.id;
                                const isSaving = savingId === product.id;
                                const isDeleting = deletingId === product.id;

                                return (
                                    <tr key={product.id} className="app-table-row">
                                        {isEditing ? (
                                            // Inline edit mode
                                            <>
                                                <td className="app-table-cell">
                                                    <div className="app-field-stack">
                                                        <input
                                                            type="text"
                                                            className="app-text-input"
                                                            value={editDraft.name ?? ''}
                                                            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                                                            placeholder="Product name"
                                                        />
                                                        <input
                                                            type="text"
                                                            className="app-text-input app-text-input-sm"
                                                            value={editDraft.description ?? ''}
                                                            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                                                            placeholder="Description"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="app-table-cell">
                                                    <input
                                                        type="number"
                                                        className="app-text-input app-text-input-sm"
                                                        value={editDraft.price ?? 0}
                                                        onChange={(e) => setEditDraft({ ...editDraft, price: Number(e.target.value) })}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="app-table-cell">
                                                    <input
                                                        type="text"
                                                        className="app-text-input app-text-input-sm"
                                                        value={editDraft.category ?? ''}
                                                        onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                                                        placeholder="Category"
                                                    />
                                                </td>
                                                <td className="app-table-cell">
                                                    <label className="app-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={editDraft.inStock ?? false}
                                                            onChange={(e) => setEditDraft({ ...editDraft, inStock: e.target.checked })}
                                                            className="app-checkbox"
                                                        />
                                                        In stock
                                                    </label>
                                                </td>
                                                <td className="app-table-cell app-table-cell-actions">
                                                    <div className="app-action-row app-action-row-compact">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleInlineSave(product.id!)}
                                                            disabled={isSaving}
                                                            className="app-button-save"
                                                        >
                                                            {isSaving ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelInlineEditing}
                                                            disabled={isSaving}
                                                            className="app-button-cancel"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            // View mode
                                            <>
                                                <td className="app-table-cell">
                                                    <div className="app-product-name">{product.name}</div>
                                                    {product.description && (
                                                        <div className="app-product-description">{product.description}</div>
                                                    )}
                                                </td>
                                                <td className="app-table-cell app-table-cell-price">
                                                    ${product.price}
                                                </td>
                                                <td className="app-table-cell app-table-cell-category">
                                                    {product.category || '—'}
                                                </td>
                                                <td className="app-table-cell app-table-cell-stock">
                                                    {product.inStock ? (
                                                        <span className="app-badge-stock">In Stock</span>
                                                    ) : (
                                                        <span className="app-badge-out-of-stock">Out of Stock</span>
                                                    )}
                                                </td>
                                                <td className="app-table-cell app-table-cell-actions">
                                                    <div className="app-action-row app-action-row-compact">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditModal(product)}
                                                            className="app-button-edit"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => startInlineEditing(product)}
                                                            className="app-button-edit"
                                                        >
                                                            ✏️ Quick Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteProduct(product.id!)}
                                                            disabled={isDeleting}
                                                            className="app-button-delete"
                                                        >
                                                            {isDeleting ? 'Deleting...' : '🗑️ Delete'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Product Form Modal */}
            <ProductFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleModalSubmit}
                product={editingProduct}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
            />
        </>
    );
};
