'use client';
// components/ProductList.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { productService } from '../lib/firestore/firestore-service';
import { Product } from '../lib/firestore/types';

export const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔄 Loading products...');

            const data = await productService.getAllProducts();
            setProducts(data);

            if (data.length === 0) {
                console.log('📭 No products found');
                // Optionally seed data here
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

    const handleAddProduct = async () => {
        const newProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
            name: `Product ${Date.now()}`,
            price: Math.floor(Math.random() * 100) + 10,
            description: 'Sample product description',
            category: 'Electronics',
            inStock: true,
        };

        try {
            setLoading(true);
            await productService.createProduct(newProduct);
            await loadProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            setError('Failed to add product');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading products...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">Error: {error}</p>
                    <button
                        onClick={handleRetry}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-4">
                <button
                    type="button"
                    onClick={handleAddProduct}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    Add Product
                </button>
                <span className="ml-4 text-gray-600">
                    Total: {products.length} products
                </span>
            </div>

            {products.length === 0 ? (
                <p className="text-gray-500">No products available. Click &quot;Add Product&quot; to create one.</p>
            ) : (
                <ul className="space-y-2">
                    {products.map((product) => (
                        <li key={product.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-blue-600">${product.price}</span>
                            </div>
                            {product.description && (
                                <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
