import { getFirebaseAdminFirestore } from '../firebase/admin-firestore';
import { sampleProducts } from './seedData';
// lib/firestore/seed.ts

/**
 * Seed initial product data into Firestore
 * This function checks if products already exist and only adds new ones
 */
export async function seedInitialData(): Promise<{
    success: boolean;
    message: string;
    addedCount: number;
    skippedCount: number;
}> {
    try {
        const db = getFirebaseAdminFirestore();
        if (!db) throw new Error('Firebase Admin Firestore is not initialized');

        const productsCollection = db.collection('products');
        const batch = db.batch();
        let addedCount = 0;
        let skippedCount = 0;

        for (const productData of sampleProducts) {
            // Check if product with same name already exists
            const querySnapshot = await productsCollection.where('name', '==', productData.name).get();

            if (querySnapshot.empty) {
                // Product doesn't exist, add it
                const docRef = productsCollection.doc();
                batch.set(docRef, {
                    ...productData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                addedCount++;
            } else {
                // Product already exists, skip it
                skippedCount++;
                console.log(`⏭️ Skipped existing product: ${productData.name}`);
            }
        }

        // Commit the batch
        await batch.commit();

        const message = `✅ Successfully seeded ${addedCount} products (${skippedCount} already existed)`;
        console.log(message);

        return {
            success: true,
            message,
            addedCount,
            skippedCount,
        };
    } catch (error) {
        console.error('❌ Error seeding products:', error);
        return {
            success: false,
            message: `Error seeding products: ${error instanceof Error ? error.message : String(error)}`,
            addedCount: 0,
            skippedCount: 0,
        };
    }
}

/**
 * Seed only if collection is empty (for initial setup)
 */
export async function seedIfEmpty(): Promise<{
    success: boolean;
    message: string;
    addedCount: number;
}> {
    try {
        const db = getFirebaseAdminFirestore();
        if (!db) throw new Error('Firebase Admin Firestore is not initialized');

        const querySnapshot = await db.collection('products').get();

        if (querySnapshot.empty) {
            console.log('📦 Collection is empty, seeding initial data...');
            const result = await seedInitialData();
            return {
                success: result.success,
                message: result.message,
                addedCount: result.addedCount,
            };
        } else {
            const message = `📚 Collection already has ${querySnapshot.size} documents, skipping seed`;
            console.log(message);
            return {
                success: true,
                message,
                addedCount: 0,
            };
        }
    } catch (error) {
        console.error('❌ Error checking collection:', error);
        return {
            success: false,
            message: `Error checking collection: ${error instanceof Error ? error.message : String(error)}`,
            addedCount: 0,
        };
    }
}

/**
 * Clear all products (for testing purposes)
 */
export async function clearProducts(): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
}> {
    try {
        const db = getFirebaseAdminFirestore();
        if (!db) throw new Error('Firebase Admin Firestore is not initialized');

        const querySnapshot = await db.collection('products').get();

        if (querySnapshot.empty) {
            return {
                success: true,
                message: 'Collection is already empty',
                deletedCount: 0,
            };
        }

        const batch = db.batch();
        let deletedCount = 0;

        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
        });

        await batch.commit();

        const message = `🗑️ Successfully deleted ${deletedCount} products`;
        console.log(message);

        return {
            success: true,
            message,
            deletedCount,
        };
    } catch (error) {
        console.error('❌ Error clearing products:', error);
        return {
            success: false,
            message: `Error clearing products: ${error instanceof Error ? error.message : String(error)}`,
            deletedCount: 0,
        };
    }
}
