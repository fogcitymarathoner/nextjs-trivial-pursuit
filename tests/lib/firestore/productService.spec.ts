import { expect, test } from '../../fixtures';
import type { ProductListTestAdapter } from '../../../components/product/productListTestAdapter';
import type { FirebaseTestOutcome } from '../../../app/experiment/products/testAdapter';
// tests/lib/firestore/productService.spec.ts
test.describe('Product service browser integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            const connectionOutcomes: FirebaseTestOutcome[] = [{ type: 'resolve' }];
            const productAdapter: ProductListTestAdapter = {
                authUserId: 'service-test-user',
                getAllProducts: async () => [{
                    id: 'product-1',
                    name: 'Service Test Product',
                    price: 24.5,
                    description: 'Loaded through the product integration boundary',
                    category: 'Testing',
                    inStock: true,
                }],
                createProduct: async () => 'created-product',
                updateProduct: async () => undefined,
                deleteProduct: async () => undefined,
            };
            window.__PRODUCTS_FIREBASE_TEST_OUTCOMES__ = connectionOutcomes;
            window.__PRODUCT_LIST_TEST_ADAPTER__ = productAdapter;
        });
        await page.goto('/experiment/products', { waitUntil: 'domcontentloaded' });
    });

    test('renders products returned through the service boundary', async ({ page }) => {
        const row = page.getByRole('row').filter({ hasText: 'Service Test Product' });
        await expect(row).toBeVisible();
        await expect(row).toContainText('$24.5');
        await expect(row).toContainText('Testing');
        await expect(row).toContainText('In Stock');
    });

    test('exposes authenticated product actions', async ({ page }) => {
        await expect(page.getByText(/Authenticated \(service-test-user\)/)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add Product' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Quick Edit/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /Delete/ })).toBeVisible();
    });
});
