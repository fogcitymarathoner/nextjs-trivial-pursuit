
// tests/utils/homePageTestHelpers.ts
import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
    constructor(private page: Page) {}

    // Locators
    get mainContainer(): Locator {
        return this.page.locator('main.app-page');
    }

    get appContainer(): Locator {
        return this.mainContainer.locator(':scope > .app-container');
    }

    get heading(): Locator {
        return this.page.locator('h1.page-title');
    }

    get description(): Locator {
        return this.page.locator('p.page-description');
    }

    get surfacePanel(): Locator {
        return this.page.locator('section.surface-panel');
    }

    get bodyCopy(): Locator {
        return this.page.locator('p.body-copy');
    }

    // Actions
    async navigate() {
        await this.page.goto('/');
    }

    async waitForPageLoad() {
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForLoadState('domcontentloaded');
    }

    // Assertions
    async verifyAllElementsVisible() {
        await expect(this.mainContainer).toBeVisible();
        await expect(this.appContainer).toBeVisible();
        await expect(this.heading).toBeVisible();
        await expect(this.description).toBeVisible();
        await expect(this.surfacePanel).toBeVisible();
        await expect(this.bodyCopy).toBeVisible();
    }

    async verifyHeadingText(expected: string) {
        await expect(this.heading).toContainText(expected);
    }

    async verifyPanelClasses() {
        await expect(this.surfacePanel).toHaveClass(/surface-panel-spacious/);
        await expect(this.surfacePanel).toHaveClass(/surface-panel-compact/);
    }
}
