import { test, expect } from '@playwright/test';

test.describe('NavBar', () => {
    test('should show all navigation links', async ({ page }) => {
        await page.goto('/');

        // Check all nav links are visible
        await expect(page.locator('text=Home')).toBeVisible();
        await expect(page.locator('text=About')).toBeVisible();
        await expect(page.locator('text=Marc')).toBeVisible();
        await expect(page.locator('button:has-text("Games")')).toBeVisible();
    });

    test('should open and close games dropdown', async ({ page }) => {
        await page.goto('/');

        // Open dropdown
        await page.click('button:has-text("Games")');
        await expect(page.locator('text=Game 1')).toBeVisible();
        await expect(page.locator('text=Game 2')).toBeVisible();

        // Close dropdown
        await page.click('button:has-text("Games")');
        await expect(page.locator('text=Game 1')).not.toBeVisible();
    });

    test.skip('should navigate to game pages', async ({ page }) => {
        await page.goto('/');

        // Open dropdown and click Game 1
        await page.click('button:has-text("Games")');
        await page.click('text=Game 1');
        await expect(page).toHaveURL('/games/game1');

        // Go back and try Game 2
        await page.goto('/');
        await page.click('button:has-text("Games")');
        await page.click('text=Game 2');
        await expect(page).toHaveURL('/games/game2');
    });
});