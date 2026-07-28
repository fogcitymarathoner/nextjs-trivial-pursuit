// tests/app/marc-metadata.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Marc Page Metadata Validation', () => {
    test('should have all required meta tags', async ({ page }) => {
        await page.goto('/marc');
        await page.waitForLoadState('networkidle');

        // Get all meta tags
        const metaTags = await page.$$eval('meta', (elements) => {
            return elements.map(el => ({
                name: el.getAttribute('name'),
                property: el.getAttribute('property'),
                content: el.getAttribute('content')
            }));
        });

        // Check for description
        const description = metaTags.find(tag => tag.name === 'description');
        expect(description).toBeDefined();
        expect(description?.content).toBe('Learn about Marc');

        // Check for OG tags
        const ogTitle = metaTags.find(tag => tag.property === 'og:title');
        expect(ogTitle).toBeDefined();
        expect(ogTitle?.content).toBe('Marc');

        const ogDescription = metaTags.find(tag => tag.property === 'og:description');
        expect(ogDescription).toBeDefined();
        expect(ogDescription?.content).toBe('Learn about Marc');
    });
});