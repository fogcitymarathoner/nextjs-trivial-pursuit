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

test.describe('Q&A page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
    await page.goto('/qa', { waitUntil: 'domcontentloaded' });
  });

  test('renders the Q&A workspace with the configured Pinecone index', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Q&A', level: 1 })).toBeVisible();
    await expect(page.getByText(
      'Ask against a Pinecone index, inspect the retrieved context, and control when general knowledge is allowed.',
    )).toBeVisible();

    await expect(page.getByRole('textbox', { name: 'Question' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask' })).toBeEnabled();
    await expect(page.locator('select')).toHaveValue(/.+/);
    await expect(page.locator('select').getByRole('option', { name: /Presidents/ })).toHaveCount(1);
    await expect(page.getByRole('slider')).toHaveValue('0.5');
    await expect(page.getByRole('checkbox', { name: 'Fallback to General Knowledge' })).toBeChecked();
  });
});
