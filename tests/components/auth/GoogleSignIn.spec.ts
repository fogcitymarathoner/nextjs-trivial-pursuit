import { expect, test } from '../../fixtures';
import type { Page } from '@playwright/test';
import type { GoogleSignInTestAdapter } from '../../../components/auth/googleSignInTestAdapter';
// tests/components/auth/GoogleSignIn.spec.ts
type SignInOutcome = {
  code?: string;
  delay?: number;
  errorKind?: 'error' | 'object';
  message?: string;
  token?: string;
};

async function openLogin(page: Page, outcome?: SignInOutcome) {
  await page.route('**/api/auth/verify', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: false }),
  }));

  if (outcome) {
    await page.addInitScript(async testOutcome => {
      const testSignIn: GoogleSignInTestAdapter = async () => {
        if (testOutcome.delay) {
          await new Promise(resolve => setTimeout(resolve, testOutcome.delay));
        }
        if (testOutcome.errorKind === 'error') {
          throw new Error(testOutcome.message);
        }
        if (testOutcome.errorKind === 'object') {
          throw { code: testOutcome.code, message: testOutcome.message };
        }
        return testOutcome.token ?? 'test-id-token';
      };
      window.__GOOGLE_SIGN_IN_TEST__ = testSignIn;
    }, outcome);
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll('button'))
      .find(element => element.textContent?.includes('Sign in with Google'));
    return button !== undefined
      && Object.keys(button).some(key => key.startsWith('__reactProps$'));
  });
}

test.describe('GoogleSignIn', () => {
  test('renders an enabled Google sign-in action without an initial error', async ({ page }) => {
    await openLogin(page);
    const signInButton = page.getByRole('button', { name: 'Sign in with Google' });

    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
    await expect(signInButton.locator('svg')).toHaveCount(1);
    await expect(page.locator('.bg-red-50')).toHaveCount(0);
  });

  test('shows a disabled loading action while sign-in is pending', async ({ page }) => {
    await openLogin(page, {
      delay: 500,
      errorKind: 'object',
      code: 'auth/popup-closed-by-user',
    });

    await page.getByRole('button', { name: 'Sign in with Google' }).click();
    const loadingButton = page.getByRole('button', { name: 'Signing in...' });
    await expect(loadingButton).toBeDisabled();
    await expect(loadingButton.locator('.animate-spin')).toBeVisible();
    await expect(page.getByText('Sign-in popup was closed. Please try again.')).toBeVisible();
  });

  const authErrors = [
    {
      name: 'blocked popup',
      outcome: { errorKind: 'object', code: 'auth/popup-blocked' } as SignInOutcome,
      message: 'Pop-up was blocked. Please allow pop-ups for this site.',
    },
    {
      name: 'unauthorized domain',
      outcome: { errorKind: 'object', code: 'auth/unauthorized-domain' } as SignInOutcome,
      message: 'This domain is not authorized. Please contact support.',
    },
    {
      name: 'standard Error',
      outcome: { errorKind: 'error', message: 'Identity provider unavailable' } as SignInOutcome,
      message: 'Identity provider unavailable',
    },
    {
      name: 'message-only error',
      outcome: { errorKind: 'object', message: 'Custom authentication failure' } as SignInOutcome,
      message: 'Custom authentication failure',
    },
    {
      name: 'unknown error',
      outcome: { errorKind: 'object' } as SignInOutcome,
      message: 'Failed to login. Please try again.',
    },
  ];

  for (const scenario of authErrors) {
    test(`maps the ${scenario.name} to a useful message`, async ({ page }) => {
      await openLogin(page, scenario.outcome);
      await page.getByRole('button', { name: 'Sign in with Google' }).click();
      await expect(page.locator('.bg-red-50').getByText(scenario.message, { exact: true }))
        .toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
    });
  }

  test('creates a session and navigates to the dashboard', async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;
    await page.route('**/api/auth/session', async route => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'set-cookie': 'session=test-session-token; Path=/; HttpOnly; SameSite=Lax' },
        body: '{}',
      });
    });
    await page.route('**/dashboard', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Dashboard</body></html>',
    }));
    await openLogin(page, { token: 'signed-id-token' });

    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(requestBody).toEqual({ idToken: 'signed-id-token' });
  });

  test('shows the server message when session creation fails', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Session service unavailable' }),
    }));
    await openLogin(page, { token: 'test-token' });

    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    await expect(page.locator('.bg-red-50').getByText('Session service unavailable'))
      .toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('uses a fallback message when session creation returns no error', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{}',
    }));
    await openLogin(page, { token: 'test-token' });

    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    await expect(page.locator('.bg-red-50').getByText('Failed to create session'))
      .toBeVisible();
  });
});
