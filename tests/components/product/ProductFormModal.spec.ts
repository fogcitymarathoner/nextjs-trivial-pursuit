import { expect, test } from '../../fixtures';

const route = '/experiment/ui/product-form-modal';

test.describe('ProductFormModal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const openButton = page.getByRole('button', { name: 'Open Product Form' });
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(element => element.textContent?.includes('Open Product Form'));
      return button !== undefined
        && Object.keys(button).some(key => key.startsWith('__reactProps$'));
    });
    await openButton.click();
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible();
  });

  test('validates required product fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Product' }).click();

    await expect(page.getByText('Product name is required')).toBeVisible();
    await expect(page.getByText('Price must be greater than 0')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible();
  });

  test('submits product values and closes the modal', async ({ page }) => {
    await page.getByLabel('Product Name *').fill('Desk Lamp');
    await page.getByLabel('Price *').fill('39.95');
    await page.getByLabel('Description').fill('Adjustable LED lamp');
    await page.getByLabel('Category').fill('Lighting');
    await page.getByRole('switch').click();
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('button', { name: 'Create Product' }).click();

    await expect(page.getByRole('heading', { name: 'Add New Product' })).toHaveCount(0);
    await expect(page.getByTestId('submitted-product')).toContainText('Desk Lamp');
    await expect(page.getByTestId('submitted-product')).toContainText('39.95');
    await expect(page.getByTestId('submitted-product')).toContainText('"inStock":false');
  });

  test('closes without submitting when cancelled', async ({ page }) => {
    await page.getByLabel('Product Name *').fill('Unsaved product');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Add New Product' })).toHaveCount(0);
    await expect(page.getByTestId('submitted-product')).toHaveCount(0);
  });
});
