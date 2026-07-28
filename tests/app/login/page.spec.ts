import { expect, test } from '../../fixtures';

test.describe('Login page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const signInButton = Array.from(document.querySelectorAll('button'))
                .find((button) => button.textContent?.includes('Sign in with Google'));

            return signInButton !== undefined
                && Object.keys(signInButton).some((key) => key.startsWith('__reactProps$'));
        });
    });

    test('renders the Google sign-in action', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
        await expect(page.getByText('Use your Google account to sign in')).toBeVisible();

        const signInButton = page.getByRole('button', { name: 'Sign in with Google' });
        await expect(signInButton).toBeVisible();
        await expect(signInButton).toBeEnabled();
    });

    test('does not display an authentication error before sign-in', async ({ page }) => {
        await expect(page.getByText('Failed to login. Please try again.')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
    });
});
