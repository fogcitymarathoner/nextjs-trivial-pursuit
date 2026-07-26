import { expect, test } from './fixtures';

test.describe('Firebase connection', () => {
  test('runs the Firebase connection check in the browser application', async ({ page }) => {
    const firebaseMessages: string[] = [];
    page.on('console', message => {
      const text = message.text();
      if (text.includes('Firebase connection')) firebaseMessages.push(text);
    });

    await page.goto('/experiment/products', { waitUntil: 'domcontentloaded' });

    const connected = page.getByTestId('product-list');
    const connectionError = page.getByTestId('connection-error');
    await expect(connected.or(connectionError)).toBeVisible({ timeout: 30_000 });

    if (await connected.isVisible()) {
      await expect(connected).toBeVisible();
    } else {
      await expect(connectionError.getByRole('heading', { name: 'Connection Error' })).toBeVisible();
      await expect(connectionError.getByRole('button', { name: 'Retry Connection' })).toBeVisible();
    }

    expect(firebaseMessages.some(message =>
      message.includes('successful') || message.includes('failed'),
    )).toBe(true);
  });

  test('allows a failed connection check to be retried', async ({ page }) => {
    await page.goto('/experiment/products', { waitUntil: 'domcontentloaded' });

    const connectionError = page.getByTestId('connection-error');
    const connected = page.getByTestId('product-list');
    await expect(connectionError.or(connected)).toBeVisible({ timeout: 30_000 });

    test.skip(await connected.isVisible(), 'The configured Firebase connection is available.');

    await connectionError.getByRole('button', { name: 'Retry Connection' }).click();
    await expect(connectionError.or(connected)).toBeVisible({ timeout: 30_000 });
  });
});
