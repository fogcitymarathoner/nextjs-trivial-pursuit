// lib/firestore/tests/helpers/seedData-validators.ts
import { Product } from '../../productTypes';

export const validateProductData = (
    product: Omit<Product, 'createdAt' | 'updatedAt'>
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate name
    if (!product.name || product.name.trim().length === 0) {
        errors.push('Product name is required');
    }
    if (product.name && product.name.length > 50) {
        errors.push('Product name should be less than 50 characters');
    }

    // Validate price
    if (typeof product.price !== 'number' || product.price <= 0) {
        errors.push('Product price must be a positive number');
    }
    if (product.price && !/^\d+\.\d{2}$/.test(product.price.toString())) {
        errors.push('Product price should have exactly 2 decimal places');
    }

    // Validate description
    if (!product.description || product.description.trim().length === 0) {
        errors.push('Product description is required');
    }
    if (product.description && product.description.length > 150) {
        errors.push('Product description should be less than 150 characters');
    }

    // Validate category
    if (!product.category || product.category.trim().length === 0) {
        errors.push('Product category is required');
    }

    // Validate inStock
    if (typeof product.inStock !== 'boolean') {
        errors.push('inStock must be a boolean');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export const validateCategoryData = (category: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!category || category.trim().length === 0) {
        errors.push('Category name is required');
    }

    if (category && category.length > 30) {
        errors.push('Category name should be less than 30 characters');
    }

    if (category && !/^[A-Za-z\s&'-]+$/.test(category)) {
        errors.push('Category name contains invalid characters');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export const validateProductDataArray = (
    products: Omit<Product, 'createdAt' | 'updatedAt'>[]
): { valid: boolean; errors: string[] } => {
    const allErrors: string[] = [];

    products.forEach((product, index) => {
        const result = validateProductData(product);
        if (!result.valid) {
            result.errors.forEach((error) => {
                allErrors.push(`Product ${index + 1}: ${error}`);
            });
        }
    });

    return {
        valid: allErrors.length === 0,
        errors: allErrors,
    };
};

export const validateNoDuplicates = (
    products: Omit<Product, 'createdAt' | 'updatedAt'>[]
): { valid: boolean; duplicates: string[] } => {
    const names = products.map(p => p.name.toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

    return {
        valid: duplicates.length === 0,
        duplicates,
    };
};

export const getCategoryDistribution = (
    products: Omit<Product, 'createdAt' | 'updatedAt'>[]
): Record<string, number> => {
    const distribution: Record<string, number> = {};

    products.forEach((product) => {
        const category = product.category || 'Uncategorized';
        distribution[category] = (distribution[category] || 0) + 1;
    });

    return distribution;
};

export const getPriceStats = (
    products: Omit<Product, 'createdAt' | 'updatedAt'>[]
): {
    min: number;
    max: number;
    average: number;
    median: number;
    total: number;
} => {
    const prices = products.map(p => p.price).sort((a, b) => a - b);
    const total = prices.reduce((sum, price) => sum + price, 0);
    const average = total / prices.length;
    const median = prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];

    return {
        min: prices[0],
        max: prices[prices.length - 1],
        average,
        median,
        total,
    };
};