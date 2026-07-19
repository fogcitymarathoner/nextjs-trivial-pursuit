// tests/navbar.spec.ts
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('NavBar', () => {
    // Helper to set up authentication with proper cookies
    const setupAuth = async (page: Page, authenticated: boolean) => {
        // Mock the verify endpoint
        await page.route('**/api/auth/verify', async (route) => {
            await route.fulfill({
                status: authenticated ? 200 : 401,
                body: JSON.stringify({ authenticated }),
            });
        });

        // If authenticated, also set a session cookie to persist auth state
        if (authenticated) {
            await page.context().addCookies([
                {
                    name: 'session',
                    value: 'test-session-token',
                    domain: '127.0.0.1',
                    path: '/',
                    httpOnly: true,
                    secure: false,
                    sameSite: 'Lax',
                },
            ]);
        }
    };

    test('should show all navigation links when authenticated', async ({ page }) => {
        await setupAuth(page, true);
        await page.goto('/');

        // Check all nav links are visible
        await expect(page.locator('text=Home')).toBeVisible();
        await expect(page.locator('text=About')).toBeVisible();
        await expect(page.locator('text=Marc')).toBeVisible();
        await expect(page.locator('button:has-text("Games")')).toBeVisible();
        await expect(page.locator('text=Login')).not.toBeVisible();
        await expect(page.locator('text=Logout')).toBeVisible();
    });

    test('should not show games when unauthenticated', async ({ page }) => {
        await setupAuth(page, false);
        await page.goto('/');

        // Games button should not be visible
        await expect(page.locator('button:has-text("Games")')).not.toBeVisible();
        // Login should be visible
        await expect(page.locator('text=Login')).toBeVisible();
        await expect(page.locator('text=Logout')).not.toBeVisible();
    });

    test('should open and close games dropdown when authenticated', async ({ page }) => {
        await setupAuth(page, true);
        await page.goto('/');

        // Wait for auth to complete and loading to finish
        await page.waitForSelector('button:has-text("Games")', { state: 'visible', timeout: 5000 });

        // Open dropdown
        await page.click('button:has-text("Games")');
        await expect(page.locator('text=Game 1')).toBeVisible();
        await expect(page.locator('text=Game 2')).toBeVisible();

        // Close dropdown
        await page.click('button:has-text("Games")');
        await expect(page.locator('text=Game 1')).not.toBeVisible();
    });

    test('should not open games dropdown when unauthenticated', async ({ page }) => {
        await setupAuth(page, false);
        await page.goto('/');

        // Games button should not be visible
        await expect(page.locator('button:has-text("Games")')).not.toBeVisible();

        // Verify the dropdown doesn't exist
        await expect(page.locator('text=Game 1')).not.toBeVisible();
        await expect(page.locator('text=Game 2')).not.toBeVisible();
    });

    test('should navigate to game pages when authenticated', async ({ page }) => {
        await setupAuth(page, true);

        // Mock the game pages to allow access
        await page.route('**/games/game1', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: '<html><body>Game 1 Page</body></html>',
            });
        });

        await page.route('**/games/game2', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: '<html><body>Game 2 Page</body></html>',
            });
        });

        await page.goto('/');

        // Wait for auth to complete
        await page.waitForSelector('button:has-text("Games")', { state: 'visible', timeout: 5000 });

        // Open dropdown and click Game 1
        await page.click('button:has-text("Games")');
        await page.click('text=Game 1');

        // Wait for navigation and verify URL
        await page.waitForURL('**/games/game1', { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/games\/game1/);

        // Verify the page loaded (optional)
        await expect(page.locator('body')).toContainText('Game 1 Page');

        // Go back and try Game 2
        await page.goto('/');

        // Wait for auth to complete again
        await page.waitForSelector('button:has-text("Games")', { state: 'visible', timeout: 5000 });

        await page.click('button:has-text("Games")');
        await page.click('text=Game 2');

        // Wait for navigation and verify URL
        await page.waitForURL('**/games/game2', { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/games\/game2/);

        // Verify the page loaded (optional)
        await expect(page.locator('body')).toContainText('Game 2 Page');
    });

    test('should close dropdown when clicking outside', async ({ page }) => {
        await setupAuth(page, true);
        await page.goto('/');

        // Wait for auth to complete
        await page.waitForSelector('button:has-text("Games")', { state: 'visible', timeout: 5000 });

        // Open dropdown
        await page.click('button:has-text("Games")');
        await expect(page.locator('text=Game 1')).toBeVisible();

        // Click outside (click on Home link)
        await page.click('text=Home');

        // Dropdown should close
        await expect(page.locator('text=Game 1')).not.toBeVisible();
    });

    test('should close dropdown on logout', async ({ page }) => {
        await setupAuth(page, true);

        // Mock logout
        await page.route('**/api/auth/logout', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true }),
            });
        });

        await page.goto('/');

        // Wait for auth to complete
        await page.waitForSelector('button:has-text("Games")', { state: 'visible', timeout: 5000 });

        // Open dropdown
        await page.click('button:has-text("Games")');
        await expect(page.locator('text=Game 1')).toBeVisible();

        // Click logout
        await page.click('text=Logout');

        // Dropdown should close and Games button should disappear
        await expect(page.locator('button:has-text("Games")')).not.toBeVisible();
        await expect(page.locator('text=Login')).toBeVisible();
    });

    test('should handle auth state change', async ({ page }) => {
        // Start unauthenticated
        await setupAuth(page, false);
        await page.goto('/');

        // Games should not be visible
        await expect(page.locator('button:has-text("Games")')).not.toBeVisible();
        await expect(page.locator('text=Login')).toBeVisible();

        // Now switch to authenticated
        await setupAuth(page, true);
        await page.reload();

        // Games should now be visible
        await page.waitForSelector('button:has-text("Games")', { state: 'visible', timeout: 5000 });
        await expect(page.locator('button:has-text("Games")')).toBeVisible();
        await expect(page.locator('text=Logout')).toBeVisible();
    });
});
