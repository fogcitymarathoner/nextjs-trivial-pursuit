// lib/firestore/tests/seedData.test.ts
import { sampleProducts, sampleCategories } from '../seedData';
import { Product } from '../types';

describe('Seed Data', () => {
    describe('sampleProducts', () => {
        it('should be an array', () => {
            expect(Array.isArray(sampleProducts)).toBe(true);
        });

        it('should have the correct number of products', () => {
            expect(sampleProducts.length).toBe(10);
        });

        it('should have unique product names', () => {
            const names = sampleProducts.map(p => p.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
        });

        it('should contain only valid product data', () => {
            sampleProducts.forEach((product) => {
                // Check required fields exist
                expect(product).toHaveProperty('name');
                expect(product).toHaveProperty('price');
                expect(product).toHaveProperty('description');
                expect(product).toHaveProperty('category');
                expect(product).toHaveProperty('inStock');

                // Check field types
                expect(typeof product.name).toBe('string');
                expect(typeof product.price).toBe('number');
                expect(typeof product.description).toBe('string');
                expect(typeof product.category).toBe('string');
                expect(typeof product.inStock).toBe('boolean');

                // Check field constraints
                expect(product.name.length).toBeGreaterThan(0);
                expect(product.price).toBeGreaterThan(0);
                expect(product.description.length).toBeGreaterThan(0);
                expect(product.category.length).toBeGreaterThan(0);
            });
        });

        it('should have valid price ranges', () => {
            const prices = sampleProducts.map(p => p.price);
            expect(Math.min(...prices)).toBeGreaterThanOrEqual(10);
            expect(Math.max(...prices)).toBeLessThanOrEqual(100);
            expect(prices.every(p => p > 0)).toBe(true);
        });

        it('should have meaningful descriptions', () => {
            sampleProducts.forEach((product) => {
                expect(product.description.length).toBeGreaterThan(10);
                expect(product.description).not.toBe(product.name);
                expect(product.description).not.toContain('undefined');
                expect(product.description).not.toContain('null');
            });
        });

        it('should have products in various categories', () => {
            const categories = sampleProducts.map(p => p.category);
            const uniqueCategories = new Set(categories);

            // Should have at least 3 different categories
            expect(uniqueCategories.size).toBeGreaterThanOrEqual(3);

            // Should include Electronics
            expect(categories).toContain('Electronics');
            expect(categories).toContain('Clothing');
            expect(categories).toContain('Home & Kitchen');
        });

        it('should have a mix of in-stock and out-of-stock products', () => {
            const inStock = sampleProducts.filter(p => p.inStock === true);
            const outOfStock = sampleProducts.filter(p => p.inStock === false);

            expect(inStock.length).toBeGreaterThan(0);
            expect(outOfStock.length).toBeGreaterThan(0);
            // Most products should be in stock
            expect(inStock.length).toBeGreaterThan(outOfStock.length);
        });
    });

    describe('Product Data Integrity', () => {
        it('should have valid product names (no empty, no special characters issues)', () => {
            sampleProducts.forEach((product) => {
                expect(product.name).toMatch(/^[A-Za-z0-9\s&'-]+$/);
                expect(product.name.length).toBeLessThanOrEqual(50);
                expect(product.name).not.toBe('');
            });
        });

        it('should have valid product descriptions', () => {
            sampleProducts.forEach((product) => {
                expect(product.description.length).toBeLessThanOrEqual(150);
                expect(product.description).not.toBe('');
                // Description should be different from name
                expect(product.description).not.toBe(product.name);
            });
        });

        it('should have product prices with proper format', () => {
            sampleProducts.forEach((product) => {
                // Price should have at most 2 decimal places
                expect(Number(product.price.toFixed(2))).toBe(product.price);
                // Price should be reasonable
                expect(product.price).toBeGreaterThanOrEqual(5);
                expect(product.price).toBeLessThanOrEqual(200);
            });
        });

        it('should have valid categories from the sampleCategories list', () => {
            sampleProducts.forEach((product) => {
                expect(sampleCategories).toContain(product.category);
            });
        });

        it('should not have duplicate products (same name and price)', () => {
            const productKeys = sampleProducts.map(p => `${p.name}-${p.price}`);
            const uniqueKeys = new Set(productKeys);
            expect(uniqueKeys.size).toBe(productKeys.length);
        });
    });

    describe('sampleCategories', () => {
        it('should be an array', () => {
            expect(Array.isArray(sampleCategories)).toBe(true);
        });

        it('should have the correct number of categories', () => {
            expect(sampleCategories.length).toBe(6);
        });

        it('should have unique category names', () => {
            const uniqueCategories = new Set(sampleCategories);
            expect(uniqueCategories.size).toBe(sampleCategories.length);
        });

        it('should contain specific expected categories', () => {
            const expectedCategories = [
                'Electronics',
                'Clothing',
                'Home & Kitchen',
                'Sports & Outdoors',
                'Books',
                'Toys & Games'
            ];

            expect(sampleCategories.sort()).toEqual(expectedCategories.sort());
        });

        it('should have all categories used in sampleProducts', () => {
            const productCategories = new Set(sampleProducts.map(p => p.category));

            // Every product category should be in sampleCategories
            productCategories.forEach((category) => {
                expect(sampleCategories).toContain(category);
            });
        });
    });

    describe('Category Distribution', () => {
        it('should have a good distribution of products across categories', () => {
            const categoryCounts: Record<string, number> = {};

            sampleProducts.forEach((product) => {
                categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
            });

            // Check each category has at least 1 product
            Object.keys(categoryCounts).forEach((category) => {
                expect(categoryCounts[category]).toBeGreaterThanOrEqual(1);
            });

            // Electronics should have the most products (at least 3)
            expect(categoryCounts['Electronics']).toBeGreaterThanOrEqual(3);

            // Home & Kitchen should have at least 2 products
            expect(categoryCounts['Home & Kitchen']).toBeGreaterThanOrEqual(2);
        });

        it('should have products across all sample categories', () => {
            const productCategories = new Set(sampleProducts.map(p => p.category));
            const missingCategories = sampleCategories.filter(c => !productCategories.has(c));

            // Some categories might not have products yet
            expect(missingCategories.length).toBeLessThanOrEqual(2);
        });
    });

    describe('Pricing Analysis', () => {
        it('should have a reasonable price range', () => {
            const prices = sampleProducts.map(p => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            expect(maxPrice - minPrice).toBeGreaterThanOrEqual(50);
            expect(minPrice).toBeGreaterThanOrEqual(10);
            expect(maxPrice).toBeLessThanOrEqual(100);
        });

        it('should have different price ranges across categories', () => {
            const electronicsPrices = sampleProducts
                .filter(p => p.category === 'Electronics')
                .map(p => p.price);

            const clothingPrices = sampleProducts
                .filter(p => p.category === 'Clothing')
                .map(p => p.price);

            // Electronics should generally be more expensive than clothing
            const avgElectronics = electronicsPrices.reduce((a, b) => a + b, 0) / electronicsPrices.length;
            const avgClothing = clothingPrices.reduce((a, b) => a + b, 0) / clothingPrices.length;

            // This is a general trend, not a strict rule
            expect(avgElectronics).toBeGreaterThanOrEqual(avgClothing - 10);
        });
    });

    describe('Data Validation', () => {
        it('should match the Product type structure', () => {
            sampleProducts.forEach((product) => {
                // Type checking - these should all be defined
                const typedProduct: Omit<Product, 'createdAt' | 'updatedAt'> = {
                    name: product.name,
                    price: product.price,
                    description: product.description,
                    category: product.category,
                    inStock: product.inStock,
                };

                expect(typedProduct).toEqual(product);
            });
        });

        it('should have products that could be converted to Product type', () => {
            sampleProducts.forEach((product) => {
                const productWithTimestamps = {
                    ...product,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                expect(productWithTimestamps).toHaveProperty('createdAt');
                expect(productWithTimestamps).toHaveProperty('updatedAt');
                expect(productWithTimestamps.createdAt instanceof Date).toBe(true);
                expect(productWithTimestamps.updatedAt instanceof Date).toBe(true);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle case-insensitive category matching', () => {
            const categories = sampleProducts.map(p => p.category.toLowerCase());
            const uniqueCategories = new Set(categories);

            // Should have at least 4 unique categories when case-insensitive
            expect(uniqueCategories.size).toBeGreaterThanOrEqual(4);
        });

        it('should have valid special characters in product names', () => {
            const specialChars = sampleProducts
                .filter(p => /[&'-]/.test(p.name))
                .map(p => p.name);

            // Should have at least one product with special characters
            expect(specialChars.length).toBeGreaterThanOrEqual(1);

            // Check no invalid characters
            sampleProducts.forEach((product) => {
                expect(product.name).not.toMatch(/[<>{}]/);
            });
        });

        it('should have products with realistic descriptions', () => {
            const descriptionKeywords = [
                'battery', 'wireless', 'organic', 'stainless', 'insulated',
                'non-slip', 'adjustable', 'lightweight', 'durable', 'portable'
            ];

            // At least one product should contain a keyword from the list
            const hasKeyword = sampleProducts.some((product) => {
                return descriptionKeywords.some(keyword =>
                    product.description.toLowerCase().includes(keyword)
                );
            });

            expect(hasKeyword).toBe(true);
        });
    });

    describe('Statistical Analysis', () => {
        it('should have a balanced product distribution', () => {
            const inStock = sampleProducts.filter(p => p.inStock).length;

            // At least 60% should be in stock
            expect(inStock / sampleProducts.length).toBeGreaterThanOrEqual(0.6);
        });

        it('should have a good spread of prices', () => {
            const prices = sampleProducts.map(p => p.price);
            const uniquePrices = new Set(prices);

            // Most products should have unique prices
            expect(uniquePrices.size).toBeGreaterThanOrEqual(sampleProducts.length * 0.7);
        });

        it('should have products with varied word counts in descriptions', () => {
            const wordCounts = sampleProducts.map(p => p.description.split(' ').length);
            const minWords = Math.min(...wordCounts);
            const maxWords = Math.max(...wordCounts);
            const uniqueWordCounts = new Set(wordCounts);

            // Descriptions should have reasonable word count variation
            expect(uniqueWordCounts.size).toBeGreaterThanOrEqual(3);
            expect(minWords).toBeGreaterThanOrEqual(3);
            expect(maxWords).toBeLessThanOrEqual(25);
        });
    });
});
