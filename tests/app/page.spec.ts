// e2e/app/page.spec.ts with Page Object Model
import { test, expect } from '@playwright/test';
import { HomePage } from '../utils/homePageTestHelpers';

test.describe('Home Page - POM', () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        homePage = new HomePage(page);
        await homePage.navigate();
        await homePage.waitForPageLoad();
    });

    test('should render all elements using POM', async () => {
        await homePage.verifyAllElementsVisible();
        await homePage.verifyHeadingText('If this is blue and big, Tailwind is working!');
        await homePage.verifyPanelClasses();
    });

    test('should have correct body copy', async ({ page }) => {
        const text = await homePage.bodyCopy.textContent();
        expect(text).toContain('Use these global page, panel, form, and content classes');
    });
});