// lib/firestore/tests/seed.integration.test.ts

// Integration test with real Firebase
import { getFirebaseAdminFirestore } from '../../firebase/admin-firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { seedInitialData, seedIfEmpty, clearProducts } from '../seed';
import { sampleProducts } from '../seedData';

// Only run if Firebase is configured
const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' &&
    (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS);

const describeIntegration = shouldRunIntegration ? describe : describe.skip;

describeIntegration('Firestore Seed Integration Tests', () => {
    let db: Firestore;

    beforeAll(() => {
        const firestore = getFirebaseAdminFirestore();
        if (!firestore) {
            throw new Error('Firebase Admin Firestore not initialized');
        }
        db = firestore;
    });

    beforeEach(async () => {
        // Clean up before each test
        await clearProducts();
    });

    afterAll(async () => {
        // Clean up after all tests
        await clearProducts();
    });

    it('should seed products when collection is empty', async () => {
        const result = await seedInitialData();

        expect(result.success).toBe(true);
        expect(result.addedCount).toBe(sampleProducts.length);
        expect(result.skippedCount).toBe(0);

        // Verify products were created
        const snapshot = await db.collection('products').get();
        expect(snapshot.size).toBe(sampleProducts.length);
    });

    it('should skip duplicate products', async () => {
        // First seed
        await seedInitialData();

        // Second seed (should skip all)
        const result = await seedInitialData();

        expect(result.success).toBe(true);
        expect(result.addedCount).toBe(0);
        expect(result.skippedCount).toBe(sampleProducts.length);

        // Verify products weren't duplicated
        const snapshot = await db.collection('products').get();
        expect(snapshot.size).toBe(sampleProducts.length);
    });

    it('should seed only if collection is empty', async () => {
        // First call - collection is empty
        let result = await seedIfEmpty();
        expect(result.success).toBe(true);
        expect(result.addedCount).toBe(sampleProducts.length);

        // Second call - collection has data
        result = await seedIfEmpty();
        expect(result.success).toBe(true);
        expect(result.addedCount).toBe(0);
        expect(result.message).toContain('Collection already has');
    });

    it('should clear all products', async () => {
        // Seed products first
        await seedInitialData();

        // Verify products exist
        let snapshot = await db.collection('products').get();
        expect(snapshot.size).toBe(sampleProducts.length);

        // Clear products
        const result = await clearProducts();
        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(sampleProducts.length);

        // Verify products are gone
        snapshot = await db.collection('products').get();
        expect(snapshot.size).toBe(0);
    });

    it('should handle clearing empty collection', async () => {
        // Clear when already empty
        const result = await clearProducts();
        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toBe('Collection is already empty');
    });
});
