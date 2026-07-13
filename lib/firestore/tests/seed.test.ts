// Mock dependencies
// lib/firestore/tests/seed.test.ts
jest.mock('../../firebase/admin-firestore', () => ({
    getFirebaseAdminFirestore: jest.fn(),
}));

// Mock seedData
jest.mock('../seedData', () => ({
    sampleProducts: [
        {
            name: 'Test Product 1',
            price: 29.99,
            category: 'electronics',
            inStock: true,
            description: 'Test description 1',
        },
        {
            name: 'Test Product 2',
            price: 49.99,
            category: 'books',
            inStock: true,
            description: 'Test description 2',
        },
        {
            name: 'Test Product 3',
            price: 19.99,
            category: 'clothing',
            inStock: false,
            description: 'Test description 3',
        },
    ],
}));

import { getFirebaseAdminFirestore } from '../../firebase/admin-firestore';
import { seedInitialData, seedIfEmpty, clearProducts } from '../seed';
/* eslint-disable @typescript-eslint/no-explicit-any -- This suite builds fluent Firebase Admin API test doubles. */
import { sampleProducts } from '../seedData';

// Type the mocks
const mockGetFirebaseAdminFirestore = getFirebaseAdminFirestore as jest.MockedFunction<
    typeof getFirebaseAdminFirestore
>;

describe('Firestore Seed Functions', () => {
    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    // Mock Firestore instances
    let mockDb: any;
    let mockCollection: any;
    let mockQuery: any;
    let mockBatch: any;
    let mockDocRef: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset console mocks
        console.log = jest.fn();
        console.error = jest.fn();

        // Setup mock doc reference
        mockDocRef = {
            id: 'mock-doc-id',
            set: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
        };

        // Setup mock batch
        mockBatch = {
            set: jest.fn(),
            delete: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        // Setup mock query
        mockQuery = {
            where: jest.fn().mockReturnThis(),
            get: jest.fn(),
            empty: true,
            docs: [],
            size: 0,
        };

        // Setup mock collection
        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDocRef),
            where: jest.fn().mockReturnValue(mockQuery),
            get: jest.fn(),
        };

        // Setup mock db
        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
            batch: jest.fn().mockReturnValue(mockBatch),
        };

        // Mock getFirebaseAdminFirestore
        mockGetFirebaseAdminFirestore.mockReturnValue(mockDb);
    });

    afterAll(() => {
        // Restore console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    describe('seedInitialData', () => {
        it('should seed products when collection is empty', async () => {
            // Mock query to return empty (no products exist)
            mockQuery.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
            });

            const result = await seedInitialData();

            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(sampleProducts.length);
            expect(result.skippedCount).toBe(0);
            expect(result.message).toContain('Successfully seeded');
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('✅ Successfully seeded')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining(`${sampleProducts.length} products`)
            );
            expect(mockDb.collection).toHaveBeenCalledWith('products');
            expect(mockBatch.set).toHaveBeenCalledTimes(sampleProducts.length);
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should skip products that already exist', async () => {
            // Mock query to return existing products for first product
            mockQuery.get.mockImplementation(() => {
                return Promise.resolve({
                    empty: false,
                    docs: [{ id: 'existing-1', data: () => ({ name: 'Test Product 1' }) }],
                    size: 1,
                });
            });

            // Mock query for second product to be empty
            mockQuery.get.mockImplementationOnce(() =>
                Promise.resolve({
                    empty: false,
                    docs: [{ id: 'existing-1' }],
                    size: 1,
                })
            );
            mockQuery.get.mockImplementationOnce(() =>
                Promise.resolve({
                    empty: true,
                    docs: [],
                    size: 0,
                })
            );
            mockQuery.get.mockImplementationOnce(() =>
                Promise.resolve({
                    empty: true,
                    docs: [],
                    size: 0,
                })
            );

            // Need to reset the mock chain for each product
            // Simulate different products existing or not
            const existingProducts = ['Test Product 1'];

            mockCollection.where.mockImplementation((_field: string, _op: string, value: string) => {
                const exists = existingProducts.includes(value);
                return {
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({
                        empty: !exists,
                        docs: exists ? [{ id: 'existing-1' }] : [],
                        size: exists ? 1 : 0,
                    }),
                };
            });

            const result = await seedInitialData();

            expect(result.success).toBe(true);
            expect(result.skippedCount).toBe(1);
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('⏭️ Skipped existing product: Test Product 1')
            );
        });

        it('should handle database initialization error', async () => {
            mockGetFirebaseAdminFirestore.mockReturnValue(null);

            const result = await seedInitialData();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Firebase Admin Firestore is not initialized');
            expect(result.addedCount).toBe(0);
            expect(result.skippedCount).toBe(0);
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle Firestore errors', async () => {
            const mockError = new Error('Firestore connection failed');
            mockQuery.get.mockRejectedValue(mockError);

            const result = await seedInitialData();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error seeding products');
            expect(result.message).toContain('Firestore connection failed');
            expect(result.addedCount).toBe(0);
            expect(result.skippedCount).toBe(0);
            expect(console.error).toHaveBeenCalledWith(
                '❌ Error seeding products:',
                mockError
            );
        });

        it('should handle batch commit failure', async () => {
            mockQuery.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
            });

            const mockError = new Error('Batch commit failed');
            mockBatch.commit.mockRejectedValue(mockError);

            const result = await seedInitialData();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error seeding products');
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle non-Error exceptions', async () => {
            mockQuery.get.mockRejectedValue('String error');

            const result = await seedInitialData();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error seeding products');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('seedIfEmpty', () => {
        it('should seed data when collection is empty', async () => {
            // Mock empty collection
            mockCollection.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
            });

            // Mock the seed operation
            mockQuery.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
            });

            const result = await seedIfEmpty();

            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(sampleProducts.length);
            expect(result.message).toContain('Successfully seeded');
            expect(console.log).toHaveBeenCalledWith(
                '📦 Collection is empty, seeding initial data...'
            );
            expect(mockDb.collection).toHaveBeenCalledWith('products');
        });

        it('should skip seeding when collection has documents', async () => {
            const existingDocs = [
                { id: 'doc-1', data: () => ({ name: 'Product 1' }) },
                { id: 'doc-2', data: () => ({ name: 'Product 2' }) },
            ];

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: existingDocs,
                size: existingDocs.length,
                forEach: jest.fn(),
            });

            const result = await seedIfEmpty();

            expect(result.success).toBe(true);
            expect(result.addedCount).toBe(0);
            expect(result.message).toContain(
                `Collection already has ${existingDocs.length} documents`
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('📚 Collection already has')
            );
            // Should not call seedInitialData
            expect(mockBatch.set).not.toHaveBeenCalled();
        });

        it('should handle database initialization error', async () => {
            mockGetFirebaseAdminFirestore.mockReturnValue(null);

            const result = await seedIfEmpty();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Firebase Admin Firestore is not initialized');
            expect(result.addedCount).toBe(0);
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle errors when checking collection', async () => {
            const mockError = new Error('Failed to get collection');
            mockCollection.get.mockRejectedValue(mockError);

            const result = await seedIfEmpty();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error checking collection');
            expect(console.error).toHaveBeenCalledWith(
                '❌ Error checking collection:',
                mockError
            );
        });
    });

    describe('clearProducts', () => {
        it('should delete all products when collection has documents', async () => {
            const mockDocs = [
                { ref: { id: 'doc-1' }, data: () => ({ name: 'Product 1' }) },
                { ref: { id: 'doc-2' }, data: () => ({ name: 'Product 2' }) },
                { ref: { id: 'doc-3' }, data: () => ({ name: 'Product 3' }) },
            ];

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: mockDocs,
                size: mockDocs.length,
                forEach: jest.fn((callback) => mockDocs.forEach(callback)),
            });

            const result = await clearProducts();

            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(mockDocs.length);
            expect(result.message).toContain('Successfully deleted 3 products');
            expect(mockBatch.delete).toHaveBeenCalledTimes(mockDocs.length);
            expect(mockBatch.commit).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('🗑️ Successfully deleted')
            );
        });

        it('should handle empty collection gracefully', async () => {
            mockCollection.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
                forEach: jest.fn(),
            });

            const result = await clearProducts();

            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(0);
            expect(result.message).toBe('Collection is already empty');
            expect(mockBatch.delete).not.toHaveBeenCalled();
            expect(mockBatch.commit).not.toHaveBeenCalled();
        });

        it('should handle database initialization error', async () => {
            mockGetFirebaseAdminFirestore.mockReturnValue(null);

            const result = await clearProducts();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Firebase Admin Firestore is not initialized');
            expect(result.deletedCount).toBe(0);
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle deletion errors', async () => {
            const mockDocs = [
                { ref: { id: 'doc-1' }, data: () => ({ name: 'Product 1' }) },
            ];

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: mockDocs,
                size: 1,
                forEach: jest.fn((callback) => mockDocs.forEach(callback)),
            });

            const mockError = new Error('Failed to delete documents');
            mockBatch.commit.mockRejectedValue(mockError);

            const result = await clearProducts();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error clearing products');
            expect(console.error).toHaveBeenCalledWith(
                '❌ Error clearing products:',
                mockError
            );
        });

        it('should handle non-Error exceptions during deletion', async () => {
            const mockDocs = [
                { ref: { id: 'doc-1' }, data: () => ({ name: 'Product 1' }) },
            ];

            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: mockDocs,
                size: 1,
                forEach: jest.fn((callback) => mockDocs.forEach(callback)),
            });

            mockBatch.commit.mockRejectedValue('String error');

            const result = await clearProducts();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error clearing products');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('Integration scenarios', () => {
        it('should handle complete seed lifecycle', async () => {
            // Step 1: Seed initial data
            mockQuery.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
            });

            const seedResult = await seedInitialData();
            expect(seedResult.success).toBe(true);
            expect(seedResult.addedCount).toBe(sampleProducts.length);

            // Step 2: Try to seed again (should skip)
            // Reset mocks for second call
            jest.clearAllMocks();

            // Now simulate that products exist
            const existingDocs = sampleProducts.map((p, i) => ({
                id: `doc-${i}`,
                data: () => p,
            }));

            mockQuery.get.mockImplementation(() => {
                return Promise.resolve({
                    empty: false,
                    docs: existingDocs,
                    size: existingDocs.length,
                });
            });

            const secondSeedResult = await seedInitialData();
            expect(secondSeedResult.success).toBe(true);
            expect(secondSeedResult.addedCount).toBe(0);

            // Step 3: Clear all products
            mockCollection.get.mockResolvedValue({
                empty: false,
                docs: existingDocs.map(doc => ({ ref: { id: doc.id } })),
                size: existingDocs.length,
                forEach: jest.fn((callback) =>
                    existingDocs.map(doc => ({ ref: { id: doc.id } })).forEach(callback)
                ),
            });

            const clearResult = await clearProducts();
            expect(clearResult.success).toBe(true);
            expect(clearResult.deletedCount).toBe(existingDocs.length);
        });

        it('should handle errors in batch operations during seeding', async () => {
            mockQuery.get.mockResolvedValue({
                empty: true,
                docs: [],
                size: 0,
            });

            // Make batch commit fail for some documents
            const error = new Error('Batch commit failed');
            mockBatch.commit.mockRejectedValue(error);

            const result = await seedInitialData();

            expect(result.success).toBe(false);
            expect(result.message).toContain('Error seeding products');
            expect(console.error).toHaveBeenCalled();
        });
    });
});
