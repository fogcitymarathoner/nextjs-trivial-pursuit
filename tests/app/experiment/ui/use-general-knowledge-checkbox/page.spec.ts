import { expect, test } from '../../../../fixtures';
import type { Locator } from '@playwright/test';

const route = '/experiment/ui/use-general-knowledge-checkbox';

const setChecked = async (checkbox: Locator, checked: boolean) => {
    await expect(async () => {
        if (checked) {
            await checkbox.check();
        } else {
            await checkbox.uncheck();
        }

        await expect(checkbox).toBeChecked({ checked });
    }).toPass({ timeout: 20_000 });
};

test.describe('General knowledge checkbox experiment', () => {
    test.describe.configure({ timeout: 60_000 });

    test.beforeEach(async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const checkbox = document.querySelector<HTMLInputElement>(
                '#fallback-to-general-knowledge',
            );

            return checkbox !== null
                && Object.keys(checkbox).some((key) => key.startsWith('__reactProps$'));
        });
    });

    test('renders the checkbox disabled by default', async ({ page }) => {
        await expect(page.getByRole('heading', {
            name: 'Search Settings',
            level: 1,
        })).toBeVisible();

        const checkbox = page.getByRole('checkbox', {
            name: 'Allow AI to use general knowledge',
        });
        await expect(checkbox).not.toBeChecked();
        await expect(page.getByText('DISABLED', { exact: true })).toBeVisible();
        await expect(page.getByText('Strict Mode: Only answering from your documents')).toBeVisible();
        await expect(page.getByText('Current Behavior:', { exact: true })).toBeHidden();
    });

    test('shows fallback behavior and warning when enabled', async ({ page }) => {
        const checkbox = page.getByRole('checkbox', {
            name: 'Allow AI to use general knowledge',
        });

        await setChecked(checkbox, true);

        await expect(page.getByText('ENABLED', { exact: true })).toBeVisible();
        await expect(page.getByText('General Knowledge Mode Active', { exact: true })).toBeVisible();
        await expect(page.getByText('Current Behavior:', { exact: true })).toBeVisible();
        await expect(page.getByText('First searches your Pinecone index for relevant documents')).toBeVisible();
        await expect(page.getByText('If no results above threshold, falls back to GPT general knowledge')).toBeVisible();
        await expect(page.getByText('Responses may not reference your specific documents')).toBeVisible();
    });

    test('shows and hides behavior section when toggling checkbox', async ({ page }) => {
        const checkbox = page.getByRole('checkbox', {
            name: 'Allow AI to use general knowledge',
        });
        const behaviorHeading = page.getByText('Current Behavior:', { exact: true });

        await expect(behaviorHeading).toBeHidden();

        await setChecked(checkbox, true);
        await expect(behaviorHeading).toBeVisible();

        await setChecked(checkbox, false);
        await expect(behaviorHeading).toBeHidden();
        await expect(page.getByText('DISABLED', { exact: true })).toBeVisible();
    });
});
