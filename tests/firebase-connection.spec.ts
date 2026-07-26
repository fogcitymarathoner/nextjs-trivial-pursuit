import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import type { ProductListTestAdapter } from '../components/product/productListTestAdapter';

type ConnectionOutcome = {
  message?: string;
  type: 'resolve' | 'reject';
};

async function openProducts(page: Page, outcomes: ConnectionOutcome[]) {
  await page.addInitScript((testOutcomes) => {
    window.__PRODUCTS_FIREBASE_TEST_OUTCOMES__ = testOutcomes;
    const productAdapter: ProductListTestAdapter = {
      authUserId: null,
      getAllProducts: () => Promise.resolve([]),
      createProduct: () => Promise.resolve('test-product'),
      updateProduct: () => Promise.resolve(),
      deleteProduct: () => Promise.resolve(),
    };
    window.__PRODUCT_LIST_TEST_ADAPTER__ = productAdapter;
  }, outcomes);
  await page.goto('/experiment/products', { waitUntil: 'domcontentloaded' });
}

test.describe('Firebase connection', () => {
  test('runs the Firebase connection check in the browser application', async ({ page }) => {
    await openProducts(page, [{ type: 'resolve' }]);

    const connected = page.getByTestId('product-list');
    await expect(connected).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Total: 0 products')).toBeVisible();
  });

  test('allows a failed connection check to be retried', async ({ page }) => {
    await openProducts(page, [
      { type: 'reject', message: 'Test connection failure' },
      { type: 'resolve' },
    ]);

    const connectionError = page.getByTestId('connection-error');
    const connected = page.getByTestId('product-list');
    await expect(connectionError).toBeVisible({ timeout: 15_000 });
    await expect(connectionError).toContainText('Test connection failure');

    await connectionError.getByRole('button', { name: 'Retry Connection' }).click();
    await expect(connected).toBeVisible({ timeout: 15_000 });
  });
});
