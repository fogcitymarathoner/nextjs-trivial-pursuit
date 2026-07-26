import { expect, test } from '../../../fixtures';
import type { Page } from '@playwright/test';
import type { ProductListTestAdapter } from '../../../../components/product/productListTestAdapter';

const route = '/experiment/products';

type FirebaseTestOutcome = {
    delay?: number;
    message?: string;
    type: 'resolve' | 'reject';
};

async function mockFirebaseConnection(page: Page, outcomes: FirebaseTestOutcome[]) {
    await page.addInitScript((mockOutcomes) => {
        window.__PRODUCTS_FIREBASE_TEST_OUTCOMES__ = mockOutcomes;
    }, outcomes);
}

async function mockProductList(page: Page) {
    await page.addInitScript(() => {
        const adapter: ProductListTestAdapter = {
            authUserId: null,
            getAllProducts: () => Promise.resolve([]),
            createProduct: () => Promise.resolve('test-product'),
            updateProduct: () => Promise.resolve(),
            deleteProduct: () => Promise.resolve(),
        };
        window.__PRODUCT_LIST_TEST_ADAPTER__ = adapter;
    });
}

async function openProductPage(
    page: Page,
    outcomes: FirebaseTestOutcome[] = [{ type: 'resolve' }],
) {
    await mockFirebaseConnection(page, outcomes);
    await mockProductList(page);
    await page.goto(route, { waitUntil: 'domcontentloaded' });
}

test.describe('Product Page', () => {
    test('renders the products page structure', async ({ page }) => {
        await openProductPage(page);
        const productPage = page.getByTestId('product-page');

        await expect(productPage).toBeVisible();
        await expect(productPage.getByRole('heading', { name: 'Products List', level: 1 })).toBeVisible();
        await expect(productPage.getByText(
            'Test harness for Firestore products document in trivia database.',
        )).toBeVisible();
        await expect(productPage.locator('div.app-container').first()).toBeVisible();

        // Test responsive viewports
        for (const viewport of [
            { width: 375, height: 667 },
            { width: 768, height: 1024 },
            { width: 1280, height: 800 },
        ]) {
            await page.setViewportSize(viewport);
            await expect(page.getByTestId('product-page')).toBeVisible();
            await expect(page.getByRole('heading', { name: 'Products List', level: 1 })).toBeVisible();
        }
    });

    test('displays idle state initially', async ({ page }) => {
        await openProductPage(page, [{ type: 'resolve', delay: 10000 }]);

        // Check idle state is shown
        await expect(page.getByTestId('connection-idle')).toBeVisible();
        await expect(page.getByText('Initializing connection...')).toBeVisible();

        // Wait for loading state to appear
        await page.waitForSelector('[data-testid="connection-loading"]', { timeout: 5000 });
        await expect(page.getByTestId('connection-loading')).toBeVisible();
    });

    test('displays loading state while connecting to Firebase', async ({ page }) => {
        await openProductPage(page, [{ type: 'resolve', delay: 10000 }]);

        // Check loading state
        await expect(page.getByTestId('connection-loading')).toBeVisible();
        await expect(page.getByText('Connecting to Firebase...')).toBeVisible();

        // Wait for either connected or error state
        await page.waitForTimeout(3000);
    });

    test('displays ProductList when Firebase connection succeeds', async ({ page }) => {
        await openProductPage(page);

        // Wait for ProductList to appear
        await page.waitForSelector('[data-testid="product-list"]', { timeout: 15000 });
        await expect(page.getByTestId('product-list')).toBeVisible();

        // Loading state should be gone
        await expect(page.getByTestId('connection-loading')).not.toBeVisible();
        await expect(page.getByTestId('connection-idle')).not.toBeVisible();
    });

    test('displays error state when Firebase connection fails', async ({ page }) => {
        await openProductPage(page, [
            { type: 'reject', message: 'Firebase connection failed' },
        ]);

        // Wait for error state
        await page.waitForSelector('[data-testid="connection-error"]', { timeout: 15000 });

        // Check error state elements
        await expect(page.getByTestId('connection-error')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeVisible();
        await expect(page.getByTestId('connection-error').getByText('Firebase connection failed')).toBeVisible();
        await expect(page.getByTestId('retry-button')).toBeVisible();
        await expect(page.getByTestId('retry-button')).toHaveText('Retry Connection');

        // Loading state should be gone
        await expect(page.getByTestId('connection-loading')).not.toBeVisible();
        await expect(page.getByTestId('product-list')).not.toBeVisible();
    });

    test('displays generic error message when error has no message', async ({ page }) => {
        await openProductPage(page, [{ type: 'reject' }]);

        // Wait for error state
        await page.waitForSelector('[data-testid="connection-error"]', { timeout: 15000 });

        // Check generic error message
        await expect(page.getByText('Failed to connect to Firebase')).toBeVisible();
    });

    test('retries connection when retry button is clicked', async ({ page }) => {
        await openProductPage(page, [
            { type: 'reject', message: 'Firebase connection failed' },
            { type: 'resolve' },
        ]);

        // Wait for error state
        await page.waitForSelector('[data-testid="connection-error"]', { timeout: 15000 });
        await expect(page.getByTestId('connection-error')).toBeVisible();

        // Click retry button
        await page.getByTestId('retry-button').click();

        // Wait for ProductList to appear after successful retry
        await page.waitForSelector('[data-testid="product-list"]', { timeout: 15000 });
        await expect(page.getByTestId('product-list')).toBeVisible();

        // Error state should be gone
        await expect(page.getByTestId('connection-error')).not.toBeVisible();
    });

    test('maintains correct aria and accessibility attributes', async ({ page }) => {
        await openProductPage(page);

        // Wait for ProductList
        await page.waitForSelector('[data-testid="product-list"]', { timeout: 15000 });

        // Check main landmarks
        await expect(page.locator('main[data-testid="product-page"]')).toBeVisible();

        // Check headings hierarchy
        await expect(page.getByRole('heading', { name: 'Products List', level: 1 })).toBeVisible();

        // Check section has correct role
        const section = page.getByTestId('product-list-container');
        await expect(section).toBeVisible();
        await expect(section).toHaveClass(/surface-panel/);
    });

    test('handles viewport changes gracefully', async ({ page }) => {
        await openProductPage(page);

        // Test different viewport sizes
        const viewports = [
            { width: 320, height: 568 },  // iPhone SE
            { width: 375, height: 812 },  // iPhone X
            { width: 768, height: 1024 }, // iPad
            { width: 1024, height: 768 }, // iPad landscape
            { width: 1440, height: 900 }, // Desktop
        ];

        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await expect(page.getByTestId('product-page')).toBeVisible();
            await expect(page.getByRole('heading', { name: 'Products List', level: 1 })).toBeVisible();

            // Check container adapts - use first() to handle multiple app-containers
            const container = page.locator('.app-container').first();
            await expect(container).toBeVisible();

            // Check section adapts
            const section = page.getByTestId('product-list-container');
            await expect(section).toBeVisible();
            await expect(section).toHaveClass(/surface-panel/);
        }
    });

    test('handles network timeout errors', async ({ page }) => {
        await openProductPage(page, [
            { type: 'reject', message: 'Connection timeout' },
        ]);

        const connectionError = page.getByTestId('connection-error');
        await expect(connectionError).toBeVisible();
        await expect(connectionError.getByText('Connection timeout')).toBeVisible();
    });

    test('retry button handles multiple failures', async ({ page }) => {
        await openProductPage(page, Array.from({ length: 3 }, () => ({
            type: 'reject' as const,
            message: 'Persistent connection failure',
        })));

        // Wait for error state
        await page.waitForSelector('[data-testid="connection-error"]', { timeout: 15000 });
        await expect(page.getByTestId('connection-error')).toBeVisible();

        // Click retry button multiple times
        await page.getByTestId('retry-button').click();
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('connection-error')).toBeVisible();
        await expect(page.getByTestId('connection-error').getByText('Persistent connection failure')).toBeVisible();

        await page.getByTestId('retry-button').click();
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('connection-error')).toBeVisible();
        await expect(page.getByTestId('connection-error').getByText('Persistent connection failure')).toBeVisible();

        // Still in error state
        await expect(page.getByTestId('product-list')).not.toBeVisible();
    });
});

// Run tests with coverage:
// COVERAGE=true yarn playwright test tests/app/experiment/products/page.spec.ts
