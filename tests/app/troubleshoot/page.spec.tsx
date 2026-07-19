import { expect, test } from '../../fixtures';
import { ROUTES } from '@/lib/constants/routes';

test.describe('TroubleShooting page', () => {
    test.beforeEach(async ({ context, page }, testInfo) => {
        await page.route('**/api/auth/verify', async (route) => {
            await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({ authenticated: true }),
            });
        });
        const baseURL = testInfo.project.use.baseURL;
        if (typeof baseURL !== 'string') {
            throw new Error('Playwright baseURL must be configured');
        }

        await context.addCookies([{
            name: 'session',
            value: 'playwright-test-session',
            url: baseURL,
        }]);
        await page.goto('/troubleshoot', { waitUntil: 'domcontentloaded' });
    });

    test('renders the page structure and content', async ({ page }) => {
        const content = page.locator('main.app-page');

        await expect(content).toBeVisible();
        await expect(content.locator('.app-container')).toBeVisible();
        await expect(content.getByRole('heading', { level: 1 })).toHaveText('Trouble Shooting');
        await expect(content.locator('.page-description')).toContainText(
            'Pages used to debug problems with integration to Firebase',
        );
        await expect(content.locator('.surface-panel')).toHaveClass(/\bsurface-panel-spacious\b/);
        await expect(content.locator('.body-copy')).toContainText(
            'Use these global page, panel, form, and content classes',
        );
    });

    test('renders the Firebase Diagnostics links', async ({ page }) => {
        const links = page.getByRole('link', { name: 'Go to Firebase Diagnostics' });

        await expect(links).toHaveCount(2);
        await expect(links.nth(0)).toHaveAttribute('href', ROUTES.TROUBLESHOOT.FIREBASE_DIAGNOSTICS);
        await expect(links.nth(0)).toHaveClass(/\bapp-link-block\b/);
        await expect(links.nth(1)).toHaveAttribute('href', ROUTES.TROUBLESHOOT.FIREBASE_DIAGNOSTICS);
        await expect(links.nth(1)).toHaveClass(/\bapp-button-primary\b/);
    });

    test('renders the Test Firebase links in separate list items', async ({ page }) => {
        const links = page.getByRole('link', { name: 'Go to Test Firebase' });

        await expect(links).toHaveCount(2);
        await expect(links.nth(0)).toHaveAttribute('href', ROUTES.TROUBLESHOOT.TEST_FIREBASE);
        await expect(links.nth(0)).toHaveClass(/\bapp-link-block\b/);
        await expect(links.nth(1)).toHaveAttribute('href', ROUTES.TROUBLESHOOT.TEST_FIREBASE);
        await expect(links.nth(1)).toHaveClass(/\bapp-button-primary\b/);
        await expect(page.locator('ul > li')).toHaveCount(4);
    });
});
