// lib/firestore/tests/seedData.types.test.ts
import { sampleProducts, sampleCategories } from '../seedData';
import { Product } from '../types';

describe('Type Safety Tests', () => {
    it('should pass TypeScript type checking for Product type', () => {
        // This test ensures the data matches the Product type
        sampleProducts.forEach((product) => {
            const typedProduct: Product = {
                ...product,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Type assertion test
            expect(typedProduct).toBeDefined();
        });
    });

    it('should be assignable to Product type with optional fields', () => {
        type ProductWithOptional = Partial<Product>;

        sampleProducts.forEach((product) => {
            const partialProduct: ProductWithOptional = product;
            expect(partialProduct).toBeDefined();
        });
    });

    it('should have consistent category types', () => {
        // Check that all categories are strings
        const categoriesAreStrings = sampleProducts.every(
            (product) => typeof product.category === 'string'
        );
        expect(categoriesAreStrings).toBe(true);

        // Check sampleCategories are strings
        const sampleCategoriesAreStrings = sampleCategories.every(
            (category) => typeof category === 'string'
        );
        expect(sampleCategoriesAreStrings).toBe(true);
    });
});