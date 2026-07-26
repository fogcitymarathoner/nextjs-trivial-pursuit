import { expect, test } from '../../fixtures';
import type { Page } from '@playwright/test';

type TestProduct = {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  inStock: boolean;
};

const product: TestProduct = {
  id: 'product-1',
  name: 'Desk Lamp',
  price: 39.95,
  description: 'Adjustable LED lamp',
  category: 'Lighting',
  inStock: true,
};

async function setupProductList(
  page: Page,
  options: { authUserId?: string | null; failLoads?: number; products?: TestProduct[] } = {},
) {
  await page.addInitScript(({ authUserId, failLoads, products }) => {
    window.__PRODUCTS_FIREBASE_TEST_OUTCOMES__ = [{ type: 'resolve' }];
    let storedProducts = products;
    let remainingLoadFailures = failLoads;

    window.__PRODUCT_LIST_TEST_ADAPTER__ = {
      authUserId,
      getAllProducts: async () => {
        if (remainingLoadFailures > 0) {
          remainingLoadFailures -= 1;
          throw new Error('Unable to load test products');
        }
        return storedProducts;
      },
      createProduct: async data => {
        storedProducts = [...storedProducts, { ...data, id: `product-${storedProducts.length + 1}` }];
        return storedProducts.at(-1)?.id ?? '';
      },
      updateProduct: async (id, data) => {
        storedProducts = storedProducts.map(item => item.id === id ? { ...item, ...data } : item);
      },
      deleteProduct: async id => {
        storedProducts = storedProducts.filter(item => item.id !== id);
      },
    };
  }, {
    authUserId: options.authUserId === undefined ? 'test-user' : options.authUserId,
    failLoads: options.failLoads ?? 0,
    products: options.products ?? [product],
  });

  await page.goto('/experiment/products', { waitUntil: 'domcontentloaded' });
}

test.describe('ProductList', () => {
  test('renders empty and populated product states', async ({ page }) => {
    await setupProductList(page, { products: [] });
    await expect(page.getByText('Total: 0 products')).toBeVisible();
    await expect(page.getByText(/No products available/)).toBeVisible();

    await setupProductList(page, { products: [product] });
    await expect(page.getByText('Total: 1 products')).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'Desk Lamp' });
    await expect(row).toContainText('$39.95');
    await expect(row).toContainText('Lighting');
    await expect(row).toContainText('In Stock');
  });

  test('retries after a load failure', async ({ page }) => {
    await setupProductList(page, { failLoads: 1 });
    await expect(page.getByTestId('product-list').getByText('Unable to load test products'))
      .toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByText('Desk Lamp')).toBeVisible();
    await expect(page.locator('.app-status-message-danger')).toHaveCount(0);
  });

  test('requires authentication before adding a product', async ({ page }) => {
    await setupProductList(page, { authUserId: null, products: [] });
    await expect(page.getByText(/Not authenticated/)).toBeVisible();

    await page.getByRole('button', { name: 'Add Product' }).click();

    await expect(page.getByText('You must be logged in to add products')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toHaveCount(0);
  });

  test('creates and edits a product with the modal', async ({ page }) => {
    await setupProductList(page, { products: [] });
    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.getByLabel('Product Name *').fill('Coffee Mug');
    await page.getByLabel('Price *').fill('12.5');
    await page.getByLabel('Category').fill('Kitchen');
    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect(page.getByText('Coffee Mug')).toBeVisible();

    const row = page.getByRole('row').filter({ hasText: 'Coffee Mug' });
    await row.getByRole('button', { name: /Edit/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible();
    await expect(page.getByLabel('Product Name *')).toHaveValue('Coffee Mug');
    await page.getByLabel('Product Name *').fill('Travel Mug');
    await page.getByRole('button', { name: 'Update Product' }).click();
    await expect(page.getByText('Travel Mug')).toBeVisible();
  });

  test('supports quick-edit save and cancel', async ({ page }) => {
    await setupProductList(page);
    let row = page.getByRole('row').filter({ hasText: 'Desk Lamp' });
    await row.getByRole('button', { name: /Quick Edit/ }).click();
    await page.getByPlaceholder('Product name').fill('Changed then cancelled');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Desk Lamp')).toBeVisible();

    row = page.getByRole('row').filter({ hasText: 'Desk Lamp' });
    await row.getByRole('button', { name: /Quick Edit/ }).click();
    await page.getByPlaceholder('Product name').fill('Reading Lamp');
    await page.getByPlaceholder('Description').fill('Updated description');
    await page.getByRole('spinbutton').fill('44.5');
    await page.getByPlaceholder('Category').fill('Office');
    await page.getByRole('checkbox', { name: 'In stock' }).uncheck();
    await page.getByRole('button', { name: 'Save' }).click();

    row = page.getByRole('row').filter({ hasText: 'Reading Lamp' });
    await expect(row).toContainText('$44.5');
    await expect(row).toContainText('Office');
    await expect(row).toContainText('Out of Stock');
  });

  test('cancels and confirms product deletion', async ({ page }) => {
    await setupProductList(page);
    const deleteButton = page.getByRole('row').filter({ hasText: 'Desk Lamp' })
      .getByRole('button', { name: /Delete/ });

    page.once('dialog', dialog => dialog.dismiss());
    await deleteButton.click();
    await expect(page.getByText('Desk Lamp')).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await deleteButton.click();
    await expect(page.getByText('Desk Lamp')).toHaveCount(0);
    await expect(page.getByText('Total: 0 products')).toBeVisible();
  });
});
