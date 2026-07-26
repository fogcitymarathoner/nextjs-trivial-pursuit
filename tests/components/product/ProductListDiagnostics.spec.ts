import { expect, test } from '../../fixtures';
import type { Page } from '@playwright/test';

async function authenticate(page: Page) {
  await page.context().addCookies([{
    name: 'session',
    value: 'test-session-token',
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
  await page.route('**/api/auth/verify', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true }),
  }));
}

test.describe('ProductListDiagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('shows the diagnostics loading state while Firestore is pending', async ({ page }) => {
    await page.route(/firestore\.googleapis\.com/, () => new Promise(() => {}));
    await page.goto('/troubleshoot/firebase-diagnostics', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Running diagnostics...')).toBeVisible();
  });

  test('renders diagnostic configuration and read results', async ({ page }) => {
    await page.goto('/troubleshoot/firebase-diagnostics', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Firebase Products Diagnostics/ }))
      .toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Project ID:')).toBeVisible();
    await expect(page.getByText('Database ID:')).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh Diagnostics/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Detailed Console Logs/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Products in Database/ })).toBeVisible();
  });
});
