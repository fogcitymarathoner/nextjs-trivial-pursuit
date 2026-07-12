// lib/firestore/tests/seedData.snapshot.test.ts
import { sampleProducts, sampleCategories } from '../seedData';

/**
 * Snapshot Tests for Seed Data
 *
 * These tests create snapshots of the seed data to detect unexpected changes.
 * If the data changes intentionally, run:
 *   npm test -- -u
 *   or
 *   npm run test:update
 *
 * To review snapshot changes, run:
 *   npm test -- --watch
 *   then press 'u' to update snapshots
 */

describe('Seed Data Snapshots', () => {
    describe('Product Data Snapshots', () => {
        it('should match the full sample products snapshot', () => {
            expect(sampleProducts).toMatchSnapshot('sample-products-full');
        });

        it('should match the product names snapshot', () => {
            const productNames = sampleProducts.map(p => p.name);
            expect(productNames).toMatchSnapshot('sample-product-names');
        });

        it('should match the product prices snapshot', () => {
            const productPrices = sampleProducts.map(p => ({
                name: p.name,
                price: p.price,
            }));
            expect(productPrices).toMatchSnapshot('sample-product-prices');
        });

        it('should match the product categories snapshot', () => {
            const productCategories = sampleProducts.map(p => ({
                name: p.name,
                category: p.category,
                inStock: p.inStock,
            }));
            expect(productCategories).toMatchSnapshot('sample-product-categories');
        });

        it('should match the product descriptions snapshot', () => {
            const productDescriptions = sampleProducts.map(p => ({
                name: p.name,
                description: p.description,
                descriptionLength: p.description.length,
            }));
            expect(productDescriptions).toMatchSnapshot('sample-product-descriptions');
        });

        it('should match the products by category snapshot', () => {
            const productsByCategory = sampleProducts.reduce((acc, product) => {
                if (!acc[product.category]) {
                    acc[product.category] = [];
                }
                acc[product.category].push({
                    name: product.name,
                    price: product.price,
                    inStock: product.inStock,
                });
                return acc;
            }, {} as Record<string, Array<Pick<(typeof sampleProducts)[number], 'name' | 'price' | 'inStock'>>>);

            expect(productsByCategory).toMatchSnapshot('sample-products-by-category');
        });

        it('should match the in-stock products snapshot', () => {
            const inStockProducts = sampleProducts
                .filter(p => p.inStock)
                .map(p => ({
                    name: p.name,
                    price: p.price,
                    category: p.category,
                }));
            expect(inStockProducts).toMatchSnapshot('sample-in-stock-products');
        });

        it('should match the out-of-stock products snapshot', () => {
            const outOfStockProducts = sampleProducts
                .filter(p => !p.inStock)
                .map(p => ({
                    name: p.name,
                    price: p.price,
                    category: p.category,
                }));
            expect(outOfStockProducts).toMatchSnapshot('sample-out-of-stock-products');
        });

        it('should match the product price distribution snapshot', () => {
            const priceDistribution = {
                under20: sampleProducts.filter(p => p.price < 20).length,
                '20-50': sampleProducts.filter(p => p.price >= 20 && p.price < 50).length,
                '50-100': sampleProducts.filter(p => p.price >= 50 && p.price < 100).length,
                over100: sampleProducts.filter(p => p.price >= 100).length,
            };
            expect(priceDistribution).toMatchSnapshot('sample-price-distribution');
        });

        it('should match the product summary snapshot', () => {
            const totalProducts = sampleProducts.length;
            const totalValue = sampleProducts.reduce((sum, p) => sum + p.price, 0);
            const averagePrice = totalValue / totalProducts;
            const inStockCount = sampleProducts.filter(p => p.inStock).length;
            const outOfStockCount = totalProducts - inStockCount;
            const categories = [...new Set(sampleProducts.map(p => p.category))];

            const summary = {
                totalProducts,
                totalValue: Math.round(totalValue * 100) / 100,
                averagePrice: Math.round(averagePrice * 100) / 100,
                inStockCount,
                outOfStockCount,
                stockRate: Math.round((inStockCount / totalProducts) * 100),
                categoryCount: categories.length,
                categories: categories.sort(),
                minPrice: Math.min(...sampleProducts.map(p => p.price)),
                maxPrice: Math.max(...sampleProducts.map(p => p.price)),
            };

            expect(summary).toMatchSnapshot('sample-product-summary');
        });
    });

    describe('Category Data Snapshots', () => {
        it('should match the full sample categories snapshot', () => {
            expect(sampleCategories).toMatchSnapshot('sample-categories-full');
        });

        it('should match the sorted categories snapshot', () => {
            const sortedCategories = [...sampleCategories].sort();
            expect(sortedCategories).toMatchSnapshot('sample-categories-sorted');
        });

        it('should match the categories with usage stats snapshot', () => {
            const categoryUsage = sampleCategories.map(category => {
                const productCount = sampleProducts.filter(p => p.category === category).length;
                const products = sampleProducts
                    .filter(p => p.category === category)
                    .map(p => p.name);
                return {
                    category,
                    productCount,
                    products,
                };
            });
            expect(categoryUsage).toMatchSnapshot('sample-categories-usage');
        });

        it('should match the unused categories snapshot', () => {
            const usedCategories = new Set(sampleProducts.map(p => p.category));
            const unusedCategories = sampleCategories.filter(c => !usedCategories.has(c));
            expect(unusedCategories).toMatchSnapshot('sample-unused-categories');
        });

        it('should match the category product distribution snapshot', () => {
            const distribution = sampleCategories.reduce((acc, category) => {
                acc[category] = sampleProducts.filter(p => p.category === category).length;
                return acc;
            }, {} as Record<string, number>);
            expect(distribution).toMatchSnapshot('sample-category-distribution');
        });
    });

    describe('Detailed Data Analysis Snapshots', () => {
        it('should match the detailed product analysis snapshot', () => {
            const detailedAnalysis = sampleProducts.map(product => ({
                name: product.name,
                nameLength: product.name.length,
                price: product.price,
                description: product.description,
                descriptionLength: product.description.length,
                descriptionWordCount: product.description.split(' ').length,
                category: product.category,
                inStock: product.inStock,
                hasSpecialChars: /[&'-]/.test(product.name),
                priceCategory: product.price < 30 ? 'budget' : product.price < 60 ? 'mid-range' : 'premium',
            }));
            expect(detailedAnalysis).toMatchSnapshot('sample-detailed-product-analysis');
        });

        it('should match the price statistics snapshot', () => {
            const prices = sampleProducts.map(p => p.price);
            const sortedPrices = [...prices].sort((a, b) => a - b);

            const stats = {
                min: sortedPrices[0],
                max: sortedPrices[sortedPrices.length - 1],
                total: sortedPrices.reduce((sum, price) => sum + price, 0),
                average: sortedPrices.reduce((sum, price) => sum + price, 0) / sortedPrices.length,
                median: sortedPrices.length % 2 === 0
                    ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
                    : sortedPrices[Math.floor(sortedPrices.length / 2)],
                range: sortedPrices[sortedPrices.length - 1] - sortedPrices[0],
                quartiles: {
                    q1: sortedPrices[Math.floor(sortedPrices.length * 0.25)],
                    q2: sortedPrices[Math.floor(sortedPrices.length * 0.5)],
                    q3: sortedPrices[Math.floor(sortedPrices.length * 0.75)],
                },
            };
            expect(stats).toMatchSnapshot('sample-price-statistics');
        });

        it('should match the product name analysis snapshot', () => {
            const nameAnalysis = {
                names: sampleProducts.map(p => p.name),
                averageLength: sampleProducts.reduce((sum, p) => sum + p.name.length, 0) / sampleProducts.length,
                longestName: sampleProducts.map(p => p.name).reduce((max, name) => name.length > max.length ? name : max),
                shortestName: sampleProducts.map(p => p.name).reduce((min, name) => name.length < min.length ? name : min),
                containsProduct: sampleProducts.filter(p => p.name.toLowerCase().includes('product')).length,
                containsBrand: sampleProducts.filter(p => /[A-Z][a-z]+/.test(p.name)).length,
            };
            expect(nameAnalysis).toMatchSnapshot('sample-name-analysis');
        });

        it('should match the description analysis snapshot', () => {
            const descriptionAnalysis = {
                descriptions: sampleProducts.map(p => p.description),
                averageLength: sampleProducts.reduce((sum, p) => sum + p.description.length, 0) / sampleProducts.length,
                longestDescription: sampleProducts.reduce((max, p) => p.description.length > max.description.length ? p : max, sampleProducts[0]),
                shortestDescription: sampleProducts.reduce((min, p) => p.description.length < min.description.length ? p : min, sampleProducts[0]),
                averageWordCount: sampleProducts.reduce((sum, p) => sum + p.description.split(' ').length, 0) / sampleProducts.length,
                keywords: {
                    noise_canceling: sampleProducts.filter(p => p.description.toLowerCase().includes('noise')).length,
                    organic: sampleProducts.filter(p => p.description.toLowerCase().includes('organic')).length,
                    wireless: sampleProducts.filter(p => p.description.toLowerCase().includes('wireless')).length,
                    premium: sampleProducts.filter(p => p.description.toLowerCase().includes('premium')).length,
                    lightweight: sampleProducts.filter(p => p.description.toLowerCase().includes('lightweight')).length,
                    durable: sampleProducts.filter(p => p.description.toLowerCase().includes('durable')).length,
                },
            };
            expect(descriptionAnalysis).toMatchSnapshot('sample-description-analysis');
        });
    });

    describe('Format and Structure Snapshots', () => {
        it('should match the product data structure snapshot', () => {
            // Create a schema representation of the product data
            const schema = {
                properties: Object.keys(sampleProducts[0] || {}),
                types: Object.entries(sampleProducts[0] || {}).map(([key, value]) => ({
                    field: key,
                    type: typeof value,
                    example: value,
                })),
                required: ['name', 'price', 'description', 'category', 'inStock'],
            };
            expect(schema).toMatchSnapshot('sample-product-schema');
        });

        it('should match the category structure snapshot', () => {
            const categoryStructure = {
                categories: sampleCategories,
                count: sampleCategories.length,
                allLowerCase: sampleCategories.every(c => c.toLowerCase() === c),
                allUpperCase: sampleCategories.every(c => c.toUpperCase() === c),
                hasSpaces: sampleCategories.some(c => c.includes(' ')),
                averageLength: sampleCategories.reduce((sum, c) => sum + c.length, 0) / sampleCategories.length,
            };
            expect(categoryStructure).toMatchSnapshot('sample-category-structure');
        });

        it('should match the data integrity snapshot', () => {
            const integrity = {
                hasNullValues: sampleProducts.some(p =>
                    Object.values(p).some(v => v === null || v === undefined)
                ),
                hasEmptyStrings: sampleProducts.some(p =>
                    Object.values(p).some(v => typeof v === 'string' && v.trim() === '')
                ),
                hasZeroOrNegativePrices: sampleProducts.some(p => p.price <= 0),
                hasInvalidCategories: sampleProducts.some(p =>
                    !sampleCategories.includes(p.category)
                ),
                allProductsHaveDescriptions: sampleProducts.every(p =>
                    p.description && p.description.length > 0
                ),
                allProductsHaveValidNames: sampleProducts.every(p =>
                    p.name && p.name.length > 0
                ),
                uniqueProductNames: new Set(sampleProducts.map(p => p.name)).size === sampleProducts.length,
            };
            expect(integrity).toMatchSnapshot('sample-data-integrity');
        });
    });

    describe('Custom Comparison Snapshots', () => {
        it('should match the products sorted by price snapshot', () => {
            const sortedByPrice = [...sampleProducts]
                .sort((a, b) => a.price - b.price)
                .map(p => ({
                    name: p.name,
                    price: p.price,
                    category: p.category,
                }));
            expect(sortedByPrice).toMatchSnapshot('sample-products-sorted-by-price');
        });

        it('should match the products sorted by name snapshot', () => {
            const sortedByName = [...sampleProducts]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(p => ({
                    name: p.name,
                    price: p.price,
                    category: p.category,
                }));
            expect(sortedByName).toMatchSnapshot('sample-products-sorted-by-name');
        });

        it('should match the products grouped by price range snapshot', () => {
            const groupedByPrice = {
                budget: sampleProducts.filter(p => p.price < 30),
                midRange: sampleProducts.filter(p => p.price >= 30 && p.price < 60),
                premium: sampleProducts.filter(p => p.price >= 60),
            };
            expect(groupedByPrice).toMatchSnapshot('sample-products-grouped-by-price');
        });

        it('should match the products with inStock status snapshot', () => {
            const stockStatus = {
                inStock: sampleProducts.filter(p => p.inStock).length,
                outOfStock: sampleProducts.filter(p => !p.inStock).length,
                byCategory: sampleProducts.reduce((acc, p) => {
                    if (!acc[p.category]) {
                        acc[p.category] = { inStock: 0, outOfStock: 0 };
                    }
                    if (p.inStock) {
                        acc[p.category].inStock++;
                    } else {
                        acc[p.category].outOfStock++;
                    }
                    return acc;
                }, {} as Record<string, { inStock: number; outOfStock: number }>),
            };
            expect(stockStatus).toMatchSnapshot('sample-stock-status');
        });
    });
});
