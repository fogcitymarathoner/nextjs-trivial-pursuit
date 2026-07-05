import { test, expect } from '@playwright/test';

test('should navigate to the about page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('heading', { level: 1, name: /About/ })).toBeVisible();
});
