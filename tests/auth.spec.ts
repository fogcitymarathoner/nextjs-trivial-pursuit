import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should show loading state', async ({ page }) => {
        // Mock slow auth response
        await page.route('**/api/auth/verify', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ authenticated: true }),
            });
        });

        await page.goto('/');
        await expect(page.locator('.animate-pulse')).toBeVisible();
    });

    test('should show logout when authenticated', async ({ page }) => {
        await page.route('**/api/auth/verify', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ authenticated: true }),
            });
        });

        await page.goto('/');
        await expect(page.locator('button:has-text("Logout")')).toBeVisible();
        await expect(page.locator('text=Login')).not.toBeVisible();
    });

    test('should show login when not authenticated', async ({ page }) => {
        await page.route('**/api/auth/verify', async (route) => {
            await route.fulfill({
                status: 401,
                body: JSON.stringify({ authenticated: false }),
            });
        });

        await page.goto('/');
        await expect(page.locator('text=Login')).toBeVisible();
        await expect(page.locator('button:has-text("Logout")')).not.toBeVisible();
    });

    test('should handle logout', async ({ page }) => {
        // Mock authenticated state
        await page.route('**/api/auth/verify', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ authenticated: true }),
            });
        });

        // Mock logout endpoint
        await page.route('**/api/auth/logout', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true }),
            });
        });

        await page.goto('/');

        // Click logout
        await page.click('button:has-text("Logout")');

        // Should redirect to home
        await expect(page).toHaveURL('/');
    });
});