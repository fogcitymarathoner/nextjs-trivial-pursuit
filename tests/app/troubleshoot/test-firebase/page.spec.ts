import { expect, test } from '../../../fixtures';
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

test.describe('Firebase troubleshooting page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('shows the initial test status while Firestore is pending', async ({ page }) => {
    await page.route(/firestore\.googleapis\.com/, () => new Promise(() => {}));

    await page.goto('/troubleshoot/test-firebase', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Testing...', { exact: true })).toBeVisible();
  });

  test('is protected from unauthenticated access', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/troubleshoot/test-firebase', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login\?redirect=%2Ftroubleshoot%2Ftest-firebase$/);
    await expect(page.getByText('Testing...', { exact: true })).toHaveCount(0);
  });
});
