// lib/firestore/tests/helpers/validate-seed-data.ts

import { sampleProducts, sampleCategories } from '../../seedData';
import {
    validateProductDataArray,
    validateNoDuplicates,
    getCategoryDistribution,
    getPriceStats
} from './seedData-validators';

console.log('🔍 Validating Seed Data...\n');

// Validate all products
const validationResult = validateProductDataArray(sampleProducts);
if (!validationResult.valid) {
    console.error('❌ Validation Errors:');
    validationResult.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
}
console.log('✅ All products are valid');

// Check for duplicates
const duplicateCheck = validateNoDuplicates(sampleProducts);
if (!duplicateCheck.valid) {
    console.warn('⚠️ Duplicate product names found:', duplicateCheck.duplicates);
} else {
    console.log('✅ No duplicate product names');
}

// Category distribution
const distribution = getCategoryDistribution(sampleProducts);
console.log('\n📊 Category Distribution:');
Object.entries(distribution).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} products`);
});

// Price statistics
const stats = getPriceStats(sampleProducts);
console.log('\n💰 Price Statistics:');
console.log(`  Min: $${stats.min.toFixed(2)}`);
console.log(`  Max: $${stats.max.toFixed(2)}`);
console.log(`  Average: $${stats.average.toFixed(2)}`);
console.log(`  Median: $${stats.median.toFixed(2)}`);
console.log(`  Total: $${stats.total.toFixed(2)}`);

// Categories check
const usedCategories = new Set(sampleProducts.map(p => p.category));
const unusedCategories = sampleCategories.filter(c => !usedCategories.has(c));
console.log('\n🏷️ Category Usage:');
console.log(`  Used Categories: ${usedCategories.size}`);
console.log(`  Unused Categories: ${unusedCategories.length}`);
if (unusedCategories.length > 0) {
    console.log(`  Unused: ${unusedCategories.join(', ')}`);
}

// Stock summary
const inStock = sampleProducts.filter(p => p.inStock).length;
const outOfStock = sampleProducts.length - inStock;
console.log('\n📦 Stock Summary:');
console.log(`  In Stock: ${inStock}`);
console.log(`  Out of Stock: ${outOfStock}`);
console.log(`  Stock Rate: ${(inStock / sampleProducts.length * 100).toFixed(1)}%`);

console.log('\n✅ Seed data validation complete!');