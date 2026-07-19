// lib/firestore/__tests__/productService.integration.test.ts
import type { User } from '../productTypes';

describe('Firestore Service Integration Tests', () => {
    // The browser SDK requires both values. Firebase Admin configuration alone
    // is not enough to initialize the client Firestore service.
    const shouldRunIntegration = Boolean(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );

    const describeOrSkip = shouldRunIntegration ? describe : describe.skip;

    describeOrSkip('Real Firebase Operations', () => {
        type FirestoreServices = typeof import('../productService');
        let firestoreService: FirestoreServices['firestoreService'];
        let userService: FirestoreServices['userService'];
        let productService: FirestoreServices['productService'];

        // Use unique test IDs to avoid conflicts
        const testId = `test-${Date.now()}`;

        beforeAll(async () => {
            ({ firestoreService, userService, productService } = await import('../productService'));
        });

        afterAll(async () => {
            // Cleanup test data
            try {
                await firestoreService.deleteDocument('users', `user-${testId}`);
                await firestoreService.deleteDocument('products', `product-${testId}`);
            } catch {
                // Ignore cleanup errors
            }
        });

        it('should create and read a user', async () => {
            const userData = {
                name: 'Integration Test User',
                email: `test-${testId}@example.com`,
            };

            // Create
            const id = await firestoreService.createDocument('users', userData);
            expect(id).toBeDefined();

            // Read
            const user = await firestoreService.getDocument<User>('users', id);
            expect(user).toBeDefined();
            expect(user?.name).toBe(userData.name);
            expect(user?.email).toBe(userData.email);
            expect(user?.createdAt).toBeDefined();
            expect(user?.updatedAt).toBeDefined();
        });

        it('should create and read a product', async () => {
            const productData = {
                name: 'Integration Test Product',
                price: 99.99,
                description: 'Product created by the Firestore integration test',
                category: 'test',
                inStock: true,
            };

            // Create
            const id = await productService.createProduct(productData);
            expect(id).toBeDefined();

            // Read
            const product = await productService.getProduct(id);
            expect(product).toBeDefined();
            expect(product?.name).toBe(productData.name);
            expect(product?.price).toBe(productData.price);
        });

        it('should update a document', async () => {
            const userData = {
                name: 'Update Test User',
                email: `update-${testId}@example.com`,
            };

            const id = await userService.createUser(userData);
            expect(id).toBeDefined();

            // Update
            const updatedName = 'Updated Integration User';
            await userService.updateUser(id, { name: updatedName });

            // Verify
            const user = await userService.getUser(id);
            expect(user?.name).toBe(updatedName);
            expect(user?.updatedAt).toBeDefined();
        });

        it('should query documents with filters', async () => {
            // Create test data
            const category = `test-category-${testId}`;
            await productService.createProduct({
                name: 'Test Product 1',
                price: 10,
                description: 'First category query test product',
                category,
                inStock: true,
            });
            await productService.createProduct({
                name: 'Test Product 2',
                price: 20,
                description: 'Second category query test product',
                category,
                inStock: true,
            });

            // Query
            const products = await productService.getProductsByCategory(category);
            expect(products.length).toBe(2);
            expect(products[0].category).toBe(category);
        });

        it('should handle empty queries', async () => {
            const users = await userService.getUsersByEmail(`nonexistent-${testId}@example.com`);
            expect(users).toEqual([]);
        });
    });
});
