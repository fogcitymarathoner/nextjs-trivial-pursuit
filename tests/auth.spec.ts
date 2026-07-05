import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should show loading state', async ({ page }) => {
        let releaseAuthCheck: (() => void) | undefined;
        const pendingAuthCheck = new Promise<void>((resolve) => {
            releaseAuthCheck = resolve;
        });

        await page.route('**/api/auth/verify', async (route) => {
            await pendingAuthCheck;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ authenticated: true }),
            });
        });

        await page.goto('/');
        await expect(page.locator('.animate-pulse')).toBeVisible({ timeout: 15000 });
        releaseAuthCheck?.();
    });

    test('should show logout when authenticated', async ({ page }) => {
        let authCheckCount = 0;

        await page.route('**/api/auth/verify', async (route) => {
            authCheckCount += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ authenticated: true }),
            });
        });

        await page.goto('/');
        await expect.poll(() => authCheckCount).toBeGreaterThan(0);
        await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('link', { name: 'Login' })).not.toBeVisible();
    });

    test('should show login when not authenticated', async ({ page }) => {
        let authCheckCount = 0;

        await page.route('**/api/auth/verify', async (route) => {
            authCheckCount += 1;
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ authenticated: false }),
            });
        });

        await page.goto('/');
        await expect.poll(() => authCheckCount).toBeGreaterThan(0);
        await expect(page.getByRole('link', { name: 'Login' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();
    });

    test('should handle logout', async ({ page }) => {
        let authCheckCount = 0;

        // Mock authenticated state
        await page.route('**/api/auth/verify', async (route) => {
            authCheckCount += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ authenticated: true }),
            });
        });

        // Mock logout endpoint
        await page.route('**/api/auth/logout', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        });

        await page.goto('/');
        await expect.poll(() => authCheckCount).toBeGreaterThan(0);
        await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });

        // Click logout
        await page.getByRole('button', { name: 'Logout' }).click();

        // Should redirect to home
        await expect(page).toHaveURL('/');
    });
});
