// components/ProductFormModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/lib/firestore/productTypes';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    product?: Product | null;
    title?: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
                                                                      isOpen,
                                                                      onClose,
                                                                      onSubmit,
                                                                      product,
                                                                      title = 'Add New Product',
                                                                  }) => {
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        description: '',
        category: '',
        inStock: true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens or product changes
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                price: product.price,
                description: product.description || '',
                category: product.category || '',
                inStock: product.inStock,
            });
        } else {
            setFormData({
                name: '',
                price: 0,
                description: '',
                category: '',
                inStock: true,
            });
        }
        setErrors({});
    }, [product, isOpen]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required';
        }
        if (formData.price <= 0) {
            newErrors.price = 'Price must be greater than 0';
        }
        if (formData.price > 999999) {
            newErrors.price = 'Price must be less than 1,000,000';
        }
        if (formData.category && formData.category.length > 50) {
            newErrors.category = 'Category must be less than 50 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
            setErrors({ submit: error instanceof Error ? error.message : 'Failed to save product' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-6 py-4">
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                    placeholder="Enter product name"
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            {/* Price */}
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                    Price *
                                </label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                    <input
                                        type="number"
                                        id="price"
                                        value={formData.price}
                                        onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                                        min="0"
                                        step="0.01"
                                        className={`block w-full rounded-md border ${errors.price ? 'border-red-500' : 'border-gray-300'} pl-7 pr-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                        placeholder="0.00"
                                    />
                                </div>
                                {errors.price && (
                                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Enter product description"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    className={`mt-1 block w-full rounded-md border ${errors.category ? 'border-red-500' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                    placeholder="Electronics, Clothing, etc."
                                />
                                {errors.category && (
                                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                                )}
                            </div>

                            {/* In Stock Toggle */}
                            <div className="flex items-center justify-between">
                                <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
                                    In Stock
                                </label>
                                <button
                                    type="button"
                                    onClick={() => handleChange('inStock', !formData.inStock)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.inStock ? 'bg-blue-600' : 'bg-gray-200'}`}
                                    role="switch"
                                    aria-checked={formData.inStock}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.inStock ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            {/* Submit Error */}
                            {errors.submit && (
                                <div className="rounded-md bg-red-50 p-3">
                                    <p className="text-sm text-red-600">{errors.submit}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    product ? 'Update Product' : 'Create Product'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};