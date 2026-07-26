import { expect, test } from '../../fixtures';
import type { Page } from '@playwright/test';
import type { TestFirebaseAdapter } from '../../../app/troubleshoot/test-firebase/testAdapter';

type AdapterOptions = {
    count?: number;
    createError?: string;
    delay?: number;
    readError?: string;
};

async function authenticate(page: Page) {
    await page.context().addCookies([{
        name: 'session', value: 'playwright-test-session', domain: '127.0.0.1', path: '/',
        httpOnly: true, secure: false, sameSite: 'Lax',
    }]);
    await page.route('**/api/auth/verify', route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
    }));
}

async function openTestFirebase(page: Page, options: AdapterOptions = {}) {
    await authenticate(page);
    await page.addInitScript(testOptions => {
        const adapter: TestFirebaseAdapter = {
            getProductCount: async () => {
                if (testOptions.delay) await new Promise(resolve => setTimeout(resolve, testOptions.delay));
                if (testOptions.readError) throw new Error(testOptions.readError);
                return testOptions.count ?? 0;
            },
            createProduct: async () => {
                if (testOptions.createError) throw new Error(testOptions.createError);
            },
        };
        window.__TEST_FIREBASE_ADAPTER__ = adapter;
    }, options);
    await page.goto('/troubleshoot/test-firebase', { waitUntil: 'domcontentloaded' });
}

test.describe('TestFirebase page', () => {
    test('shows its initial status while the read is pending', async ({ page }) => {
        await openTestFirebase(page, { count: 2, delay: 500 });
        await expect(page.getByText('Testing...', { exact: true })).toBeVisible();
    });

    test('reports the number of existing products', async ({ page }) => {
        await openTestFirebase(page, { count: 2 });
        await expect(page.getByText(/Connected! Found 2 products/)).toBeVisible();
    });

    test('creates a test product when the collection is empty', async ({ page }) => {
        await openTestFirebase(page, { count: 0 });
        await expect(page.getByText(/Created test product!/)).toBeVisible();
    });

    test('reports a product read failure', async ({ page }) => {
        await openTestFirebase(page, { readError: 'Firestore unavailable' });
        await expect(page.getByText(/Error: Firestore unavailable/)).toBeVisible();
    });

    test('reports a product creation failure', async ({ page }) => {
        await openTestFirebase(page, { count: 0, createError: 'Write denied' });
        await expect(page.getByText(/Error: Write denied/)).toBeVisible();
    });

    test('redirects unauthenticated visitors to login', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/troubleshoot/test-firebase', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/login\?redirect=%2Ftroubleshoot%2Ftest-firebase$/);
    });
});
