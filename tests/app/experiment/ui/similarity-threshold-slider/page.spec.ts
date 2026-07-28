import { expect, test } from '../../../../fixtures';
// tests/app/experiment/ui/similarity-threshold-slider/page.spec.ts
const route = '/experiment/ui/similarity-threshold-slider';

test.describe('Similarity Threshold experiment', () => {
    test.describe.configure({ timeout: 60_000 });

    test.beforeEach(async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const slider = document.querySelector<HTMLInputElement>('input[type="range"]');
            return slider !== null
                && Object.keys(slider).some((key) => key.startsWith('__reactProps$'));
        });
    });

    test('renders the default threshold and guidance', async ({ page }) => {
        await expect(page.getByRole('heading', {
            name: 'Similarity Threshold',
            level: 1,
        })).toBeVisible();
        await expect(page.getByText('Tune the minimum score required for document matches.')).toBeVisible();

        const slider = page.getByRole('slider');
        await expect(slider).toHaveAttribute('min', '0');
        await expect(slider).toHaveAttribute('max', '1');
        await expect(slider).toHaveAttribute('step', '0.01');
        await expect(slider).toHaveValue('0.5');

        await expect(page.getByText('0.50', { exact: true })).toBeVisible();
        await expect(page.getByText('(50%)', { exact: true })).toBeVisible();
        await expect(page.getByText('Default (Balanced)', { exact: true })).toBeVisible();
        await expect(page.getByText('Current threshold: 0.5', { exact: true })).toBeVisible();
        await expect(page.getByText('Will match results with similarity >= 0.5', { exact: true })).toBeVisible();
    });

    test('updates the slider and page state when a preset is selected', async ({ page }) => {
        const slider = page.getByRole('slider');

        await expect(async () => {
            await page.getByRole('button', { name: 'Strict 0.7' }).click();
            await expect(slider).toHaveValue('0.7');
        }).toPass({ timeout: 20_000 });
        await expect(page.getByText('0.70', { exact: true })).toBeVisible();
        await expect(page.getByText('(70%)', { exact: true })).toBeVisible();
        await expect(page.getByText('Very High Precision', { exact: true })).toBeVisible();
        await expect(page.getByText('Current threshold: 0.7', { exact: true })).toBeVisible();
        await expect(page.getByText('Will match results with similarity >= 0.7', { exact: true })).toBeVisible();
    });

    test('updates the threshold when the range input changes', async ({ page }) => {
        const slider = page.getByRole('slider');

        await slider.fill('0.42');

        await expect(slider).toHaveValue('0.42');
        await expect(page.getByText('0.42', { exact: true })).toBeVisible();
        await expect(page.getByText('(42%)', { exact: true })).toBeVisible();
        await expect(page.getByText('Low-Moderate', { exact: true })).toBeVisible();
        await expect(page.getByText('Current threshold: 0.42', { exact: true })).toBeVisible();
        await expect(page.getByText('Will match results with similarity >= 0.42', { exact: true })).toBeVisible();
    });
});

// Run tests with coverage:
// COVERAGE=true yarn playwright test tests/app/experiment/ui/similarity-threshold-slider/page.spec.ts