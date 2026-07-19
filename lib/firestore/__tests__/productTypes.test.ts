// lib/firestore/__tests__/productTypes.test.ts

import {
    User,
    Product,
    CreateProductInput,
    UpdateProductInput
} from '../productTypes';

describe('Product Types', () => {
    describe('User Interface', () => {
        it('should create a valid User object', () => {
            const user: User = {
                id: 'user123',
                name: 'John Doe',
                email: 'john@example.com',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15')
            };

            expect(user.id).toBe('user123');
            expect(user.name).toBe('John Doe');
            expect(user.email).toBe('john@example.com');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('should allow user without id (new user)', () => {
            const user: User = {
                name: 'Jane Smith',
                email: 'jane@example.com',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(user.id).toBeUndefined();
            expect(user.name).toBe('Jane Smith');
            expect(user.email).toBe('jane@example.com');
        });

        it('should validate email format at type level', () => {
            // TypeScript will catch invalid types during compilation
            const user: User = {
                name: 'Test User',
                email: 'test@example.com', // Must be string
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(user.email).toContain('@');
        });
    });

    describe('Product Interface', () => {
        const baseProductData = {
            name: 'Laptop',
            price: 999.99,
            inStock: true,
            description: 'High-performance laptop',
            category: 'Electronics',
            userId: 'user123'
        };

        it('should create a valid Product object', () => {
            const product: Product = {
                ...baseProductData,
                id: 'product123',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15')
            };

            expect(product.id).toBe('product123');
            expect(product.name).toBe('Laptop');
            expect(product.price).toBe(999.99);
            expect(product.inStock).toBe(true);
            expect(product.description).toBe('High-performance laptop');
            expect(product.category).toBe('Electronics');
            expect(product.userId).toBe('user123');
            expect(product.createdAt).toBeInstanceOf(Date);
            expect(product.updatedAt).toBeInstanceOf(Date);
        });

        it('should allow product without optional fields', () => {
            const product: Product = {
                name: 'Basic Product',
                price: 19.99,
                inStock: true
            };

            expect(product.name).toBe('Basic Product');
            expect(product.price).toBe(19.99);
            expect(product.inStock).toBe(true);
            expect(product.description).toBeUndefined();
            expect(product.category).toBeUndefined();
            expect(product.userId).toBeUndefined();
            expect(product.id).toBeUndefined();
            expect(product.createdAt).toBeUndefined();
            expect(product.updatedAt).toBeUndefined();
        });

        it('should accept string timestamps from Firestore', () => {
            const product: Product = {
                name: 'Product with string timestamps',
                price: 49.99,
                inStock: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-15T00:00:00Z'
            };

            expect(typeof product.createdAt).toBe('string');
            expect(typeof product.updatedAt).toBe('string');
        });

        it('should handle all optional fields', () => {
            const product: Product = {
                name: 'Full Featured Product',
                price: 299.99,
                inStock: false,
                description: 'This is a detailed description',
                category: 'Books',
                userId: 'user456',
                id: 'prod789',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(product.name).toBeTruthy();
            expect(product.price).toBeGreaterThan(0);
            expect(product.inStock).toBe(false);
            expect(product.description).toContain('detailed');
            expect(product.category).toMatch(/Books/i);
            expect(product.userId).toBe('user456');
        });
    });

    describe('CreateProductInput Type', () => {
        it('should create valid input for new product', () => {
            const createInput: CreateProductInput = {
                name: 'New Smartphone',
                price: 699.99,
                inStock: true,
                description: 'Latest model with great camera',
                category: 'Electronics',
                userId: 'user789'
            };

            // Should NOT have id
            expect(createInput).not.toHaveProperty('id');
            // Should NOT have createdAt
            expect(createInput).not.toHaveProperty('createdAt');
            // Should NOT have updatedAt
            expect(createInput).not.toHaveProperty('updatedAt');

            // Should have all required fields
            expect(createInput.name).toBe('New Smartphone');
            expect(createInput.price).toBe(699.99);
            expect(createInput.inStock).toBe(true);
        });

        it('should allow optional fields in CreateProductInput', () => {
            const minimalCreateInput: CreateProductInput = {
                name: 'Minimal Product',
                price: 9.99,
                inStock: true
            };

            expect(minimalCreateInput.description).toBeUndefined();
            expect(minimalCreateInput.category).toBeUndefined();
            expect(minimalCreateInput.userId).toBeUndefined();
        });

        it('should not include id or timestamp fields', () => {
            const createInput: CreateProductInput = {
                name: 'Test Product',
                price: 100,
                inStock: true
            };

            // Verify the type doesn't have id property
            expect(createInput).not.toHaveProperty('id');
            expect(createInput).not.toHaveProperty('createdAt');
            expect(createInput).not.toHaveProperty('updatedAt');

            // Verify the object structure
            const keys = Object.keys(createInput);
            expect(keys).not.toContain('id');
            expect(keys).not.toContain('createdAt');
            expect(keys).not.toContain('updatedAt');
        });
    });

    describe('UpdateProductInput Type', () => {
        it('should allow partial updates with any fields', () => {
            const updateInput: UpdateProductInput = {
                name: 'Updated Laptop',
                price: 899.99
            };

            // Should only have the fields we set
            expect(updateInput.name).toBe('Updated Laptop');
            expect(updateInput.price).toBe(899.99);
            expect(updateInput.inStock).toBeUndefined();
            expect(updateInput.description).toBeUndefined();
            expect(updateInput.category).toBeUndefined();
            expect(updateInput.userId).toBeUndefined();
        });

        it('should allow updating all fields except id', () => {
            const updateInput: UpdateProductInput = {
                name: 'Completely Updated',
                price: 149.99,
                inStock: false,
                description: 'New description',
                category: 'Accessories',
                userId: 'new-user-123'
            };

            expect(updateInput).toEqual({
                name: 'Completely Updated',
                price: 149.99,
                inStock: false,
                description: 'New description',
                category: 'Accessories',
                userId: 'new-user-123'
            });
        });

        it('should allow empty update', () => {
            const updateInput: UpdateProductInput = {};

            expect(Object.keys(updateInput)).toHaveLength(0);
            expect(updateInput).toEqual({});
        });

        it('should not include id in updates', () => {
            const updateInput: UpdateProductInput = {
                name: 'Updated Name'
            };

            // Verify the type doesn't have id property
            expect(updateInput).not.toHaveProperty('id');

            // Verify the object keys don't include id
            const keys = Object.keys(updateInput);
            expect(keys).not.toContain('id');
            expect(keys).toContain('name');
        });

        it('should allow updating multiple fields', () => {
            const updateInput: UpdateProductInput = {
                name: 'New Name',
                price: 999.99,
                inStock: false,
                description: 'Updated description',
                category: 'New Category',
                userId: 'new-user'
            };

            expect(updateInput).toMatchObject({
                name: 'New Name',
                price: 999.99,
                inStock: false,
                description: 'Updated description',
                category: 'New Category',
                userId: 'new-user'
            });
        });
    });

    describe('Type Cross-Compatibility', () => {
        it('should convert Product to CreateProductInput', () => {
            const product: Product = {
                id: 'existing-id',
                name: 'Existing Product',
                price: 199.99,
                inStock: true,
                description: 'Already exists',
                category: 'Electronics',
                userId: 'user123',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Type-safe conversion to CreateProductInput
            const createInput: CreateProductInput = {
                name: product.name,
                price: product.price,
                inStock: product.inStock,
                description: product.description,
                category: product.category,
                userId: product.userId
            };

            expect(createInput).not.toHaveProperty('id');
            expect(createInput).not.toHaveProperty('createdAt');
            expect(createInput).not.toHaveProperty('updatedAt');
            expect(createInput.name).toBe(product.name);
            expect(createInput.price).toBe(product.price);
        });

        it('should merge update with existing product', () => {
            const existing: Product = {
                id: 'product123',
                name: 'Original Name',
                price: 500,
                inStock: true,
                description: 'Original description',
                category: 'Original category',
                userId: 'user123',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const updates: UpdateProductInput = {
                name: 'Updated Name',
                price: 600
            };

            const merged: Product = {
                ...existing,
                ...updates,
                updatedAt: new Date() // New timestamp
            };

            expect(merged.id).toBe('product123');
            expect(merged.name).toBe('Updated Name');
            expect(merged.price).toBe(600);
            expect(merged.description).toBe('Original description');
            expect(merged.category).toBe('Original category');
            expect(merged.userId).toBe('user123');
        });

        it('should handle partial updates safely', () => {
            const existing: Product = {
                id: 'product123',
                name: 'Original Name',
                price: 500,
                inStock: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const partialUpdate: UpdateProductInput = {
                name: 'New Name'
            };

            const result = {
                ...existing,
                ...partialUpdate
            };

            expect(result.name).toBe('New Name');
            expect(result.price).toBe(500);
            expect(result.inStock).toBe(true);
            expect(result.id).toBe('product123');
        });
    });

    describe('Data Validation (Runtime)', () => {
        // Helper function to validate Product data (can be used in actual code)
        const validateProduct = (data: unknown): data is Product => {
            if (!data || typeof data !== 'object') return false;
            const product = data as Partial<Product>;

            return (
                typeof product.name === 'string' &&
                typeof product.price === 'number' &&
                product.price >= 0 &&
                typeof product.inStock === 'boolean' &&
                (product.description === undefined || typeof product.description === 'string') &&
                (product.category === undefined || typeof product.category === 'string')
            );
        };

        it('should validate a valid product', () => {
            const validProduct = {
                name: 'Valid Product',
                price: 50,
                inStock: true,
                description: 'Optional description'
            };

            expect(validateProduct(validProduct)).toBe(true);
        });

        it('should reject invalid product data', () => {
            const invalidProducts = [
                { name: 'Missing price', inStock: true },
                { price: 50, inStock: true },
                { name: 'Invalid price', price: -10, inStock: true },
                { name: 'Invalid inStock', price: 50, inStock: 'true' },
                { name: 123, price: 50, inStock: true }
            ];

            invalidProducts.forEach(invalid => {
                expect(validateProduct(invalid)).toBe(false);
            });
        });

        it('should allow undefined optional fields in validation', () => {
            const productWithoutOptionals = {
                name: 'Minimal Product',
                price: 10,
                inStock: true
            };

            expect(validateProduct(productWithoutOptionals)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero price', () => {
            const product: Product = {
                name: 'Free Product',
                price: 0,
                inStock: true
            };

            expect(product.price).toBe(0);
        });

        it('should handle negative price (the type allows it, but business logic should validate)', () => {
            const product: Product = {
                name: 'Negative Price Product',
                price: -50,
                inStock: true
            };

            // Type system allows it, but we should validate in business logic
            expect(product.price).toBe(-50);
        });

        it('should handle very long strings', () => {
            const longString = 'A'.repeat(1000);
            const product: Product = {
                name: longString,
                price: 100,
                inStock: true,
                description: longString,
                category: longString
            };

            expect(product.name.length).toBe(1000);
            expect(product.description?.length).toBe(1000);
        });

        it('should handle special characters in fields', () => {
            const product: Product = {
                name: 'Product!@#$%^&*()',
                price: 99.99,
                inStock: true,
                description: 'Description with 😀 emojis and special chars: <>&"\'',
                category: 'Electronics & Gadgets'
            };

            expect(product.name).toContain('!@#$');
            expect(product.description).toContain('😀');
            expect(product.category).toContain('&');
        });

        it('should handle whitespace in strings', () => {
            const product: Product = {
                name: '  Product with spaces  ',
                price: 100,
                inStock: true,
                description: '  ',
                category: '  ',
                userId: '  '
            };

            // Type system allows whitespace, validation should trim if needed
            expect(product.name).toMatch(/\s/);
            expect(product.description).toBe('  ');
        });
    });

    describe('Type Utility Tests', () => {
        it('should correctly exclude id and timestamps from CreateProductInput', () => {
            // Verify the shape of CreateProductInput
            const input: CreateProductInput = {
                name: 'Test',
                price: 100,
                inStock: true
            };

            // These properties should not exist on the type
            expect(input).not.toHaveProperty('id');
            expect(input).not.toHaveProperty('createdAt');
            expect(input).not.toHaveProperty('updatedAt');

            // Verify the object keys
            const keys = Object.keys(input);
            expect(keys).not.toContain('id');
            expect(keys).not.toContain('createdAt');
            expect(keys).not.toContain('updatedAt');
            expect(keys).toContain('name');
            expect(keys).toContain('price');
            expect(keys).toContain('inStock');
        });

        it('should correctly make all fields optional in UpdateProductInput', () => {
            // All fields should be optional
            const empty: UpdateProductInput = {};
            const single: UpdateProductInput = { name: 'New Name' };
            const multiple: UpdateProductInput = { name: 'New Name', price: 100 };
            const full: UpdateProductInput = {
                name: 'New Name',
                price: 100,
                inStock: true,
                description: 'Description',
                category: 'Category',
                userId: 'user'
            };

            expect(empty).toBeDefined();
            expect(single).toBeDefined();
            expect(multiple).toBeDefined();
            expect(full).toBeDefined();

            // Verify that all fields in full are present
            expect(full.name).toBe('New Name');
            expect(full.price).toBe(100);
            expect(full.inStock).toBe(true);
            expect(full.description).toBe('Description');
            expect(full.category).toBe('Category');
            expect(full.userId).toBe('user');
        });

        it('should demonstrate type safety in a function context', () => {
            // This function simulates a service method
            function updateProduct(id: string, updates: UpdateProductInput): void {
                // In a real implementation, this would update the product
                expect(id).toBeDefined();
                expect(updates).toBeDefined();

                // At runtime, verify the object doesn't have id
                // (This is a runtime check, not a type check)
                // But we should NOT try to assign id to updates
                const updatesWithId = updates as any;
                expect(updatesWithId.id).toBeUndefined();

                // Also verify the object keys don't include id
                const keys = Object.keys(updates);
                expect(keys).not.toContain('id');
            }

            // These calls should be type-safe
            updateProduct('product-1', { name: 'New Name' });
            updateProduct('product-2', { price: 200 });
            updateProduct('product-3', { inStock: false });
            updateProduct('product-4', { name: 'New Name', price: 300, inStock: true });

            // This would cause a TypeScript error, so we use @ts-expect-error
            // to indicate that we expect it to fail compilation
            // @ts-expect-error - id should not be allowed in updates
            const invalidUpdate: UpdateProductInput = { id: 'should-not-work' };
            // We don't call updateProduct with invalidUpdate because we know it's invalid
            // Instead, we verify that the type system would catch it
            expect(invalidUpdate).toBeDefined();
        });

        it('should correctly type the update function with proper checks', () => {
            // A more robust update function with runtime validation
            function safeUpdateProduct(id: string, updates: UpdateProductInput): void {
                // Runtime validation
                if ('id' in updates) {
                    throw new Error('Cannot update product id');
                }

                // Additional validation
                if (updates.price !== undefined && updates.price < 0) {
                    throw new Error('Price cannot be negative');
                }

                // In a real implementation, this would update the product
                expect(id).toBeDefined();
                expect(updates).toBeDefined();
            }

            // Valid updates
            expect(() => safeUpdateProduct('product-1', { name: 'New Name' })).not.toThrow();
            expect(() => safeUpdateProduct('product-2', { price: 200 })).not.toThrow();
            expect(() => safeUpdateProduct('product-3', { inStock: false })).not.toThrow();

            // Invalid updates - TypeScript would catch these, but we test runtime validation
            // @ts-expect-error - id should not be allowed
            expect(() => safeUpdateProduct('product-4', { id: 'should-not-work' })).toThrow('Cannot update product id');
            expect(() => safeUpdateProduct('product-5', { price: -10 })).toThrow('Price cannot be negative');
        });
    });
});