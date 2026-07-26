import { expect, test } from '../../fixtures';

const route = '/experiment/ui/pinecone-index-selector';

test.describe('IndexSelector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const selector = document.querySelector('select');
      return selector !== null
        && Object.keys(selector).some(key => key.startsWith('__reactProps$'));
    });
  });

  test('renders the configured indexes without a selection summary', async ({ page }) => {
    const selector = page.locator('select');

    await expect(selector).toBeVisible();
    await expect(selector.getByRole('option', { name: /Presidents/ })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Selected Index:' })).toHaveCount(0);
  });

  test('shows the selected index details and notifies the harness', async ({ page }) => {
    const selector = page.locator('select');
    const presidentsOption = selector.getByRole('option', { name: /Presidents/ });
    const optionValue = await presidentsOption.getAttribute('value');
    expect(optionValue).toBeTruthy();

    const [selectionResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes(route)
        && response.request().method() === 'POST'),
      selector.selectOption(optionValue!),
    ]);

    await expect(page.getByRole('heading', { name: 'Selected Index:' })).toBeVisible();
    await expect(page.getByText('Label: Presidents')).toBeVisible();
    await expect(page.getByText(/Index Name:/)).toBeVisible();
    await expect(page.getByText('Description: Historical president documents')).toBeVisible();
    expect(selectionResponse.ok()).toBe(true);
  });
});
