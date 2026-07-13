// scripts/seedProductsCollection.ts
/**
 * Script to seed the products collection in Firestore
 *
 * Usage:
 *   npx tsx scripts/seedProductsCollection.ts
 *
 * Options:
 *   --force     Force seed even if products exist
 *   --clear     Clear all products before seeding
 *   --dry-run   Show what would be done without actually doing it
 */

import { seedInitialData, seedIfEmpty, clearProducts } from '@/lib/firestore/seed';

// Parse command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force');
const clear = args.includes('--clear');
const dryRun = args.includes('--dry-run');

async function main() {
    console.log('🚀 Starting product seeding script...');
    console.log(`📋 Options: ${args.length ? args.join(', ') : 'none'}`);

    if (dryRun) {
        console.log('🏃 Dry run mode - no changes will be made');
        console.log('Would seed the following products:');
        const { sampleProducts } = await import('../lib/firestore/seedData');
        sampleProducts.forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.name} - $${product.price}`);
        });
        console.log(`Total: ${sampleProducts.length} products`);
        return;
    }

    try {
        // Clear products if requested
        if (clear) {
            console.log('🗑️ Clearing all products...');
            const clearResult = await clearProducts();
            console.log(clearResult.message);

            if (!clearResult.success) {
                console.error('❌ Failed to clear products');
                process.exit(1);
            }
        }

        // Seed products
        let result;
        if (force) {
            console.log('🔄 Force mode - seeding all products (will skip duplicates)...');
            result = await seedInitialData();
        } else {
            console.log('📦 Checking if seed is needed...');
            result = await seedIfEmpty();
        }

        console.log('📊 Result:');
        console.log(`  Success: ${result.success}`);
        console.log(`  Message: ${result.message}`);
        if ('addedCount' in result) {
            console.log(`  Added: ${result.addedCount}`);
        }
        if ('skippedCount' in result) {
            console.log(`  Skipped: ${result.skippedCount}`);
        }

        if (!result.success) {
            console.error('❌ Seeding failed');
            process.exit(1);
        }

        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

// Run the main function
main();