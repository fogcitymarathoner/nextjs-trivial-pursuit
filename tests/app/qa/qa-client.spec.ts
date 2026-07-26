import { expect, test } from '../../fixtures';
import type { Page, Route } from '@playwright/test';

const route = '/qa';

type QaPayload = {
  answer: string | null;
  matches: Array<{
    id: string;
    score: number | null;
    metadata: Record<string, unknown>;
  }>;
  hasContext: boolean;
  needsFallbackDecision: boolean;
  message: string | null;
  error?: string;
};

async function mockAnswer(page: Page, payload: QaPayload, status = 200) {
  await page.route('**/api/qa/answer', async (requestRoute: Route) => {
    await requestRoute.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

async function authenticate(page: Page) {
  await page.context().addCookies([{
    name: 'session',
    value: 'test-session-token',
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
  await page.route('**/api/auth/verify', requestRoute => requestRoute.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true }),
  }));
}

async function openHydratedPage(page: Page) {
  await authenticate(page);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const textarea = document.querySelector('textarea');
    return textarea !== null && Object.keys(textarea).some(key => key.startsWith('__reactProps$'));
  });
}

test.describe('Q&A client', () => {
  test('validates an empty question without making a request', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/qa/answer', async requestRoute => {
      requestCount += 1;
      await requestRoute.abort();
    });
    await openHydratedPage(page);

    await page.getByRole('button', { name: 'Ask' }).click();

    await expect(page.getByText('Enter a question first.')).toBeVisible();
    expect(requestCount).toBe(0);
  });

  test('submits settings and renders the answer and Pinecone matches', async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;
    await page.route('**/api/qa/answer', async requestRoute => {
      requestBody = requestRoute.request().postDataJSON() as Record<string, unknown>;
      await requestRoute.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Coolidge favored lower taxes.',
          matches: [{
            id: 'president-30',
            score: 0.8764,
            metadata: {
              text: 'Taxation should be reduced.',
              source: 'speech.txt',
              page: 4,
            },
          }],
          hasContext: true,
          needsFallbackDecision: false,
          message: null,
        }),
      });
    });
    await openHydratedPage(page);

    await page.getByRole('textbox', { name: 'Question' }).fill('  What was his tax policy?  ');
    await page.getByRole('slider').fill('0.7');
    await page.getByRole('button', { name: 'Ask' }).click();

    await expect(page.getByRole('heading', { name: 'Answer' })).toBeVisible();
    await expect(page.getByText('Coolidge favored lower taxes.')).toBeVisible();
    await page.getByText('Pinecone Results (1)').click();
    await expect(page.getByText('ID: president-30')).toBeVisible();
    await expect(page.getByText('Score: 0.876')).toBeVisible();
    await expect(page.getByText('Source: speech.txt')).toBeVisible();
    await expect(page.getByText('Page: 4')).toBeVisible();
    await expect(page.getByText('Taxation should be reduced.')).toBeVisible();
    expect(requestBody).toMatchObject({
      question: 'What was his tax policy?',
      similarityThreshold: 0.7,
      fallbackToGeneralKnowledge: true,
      pineconeIndexLabel: 'Presidents',
    });
  });

  test('offers a general-knowledge retry and sends the override', async ({ page }) => {
    const requestBodies: Array<Record<string, unknown>> = [];
    await page.route('**/api/qa/answer', async requestRoute => {
      requestBodies.push(requestRoute.request().postDataJSON() as Record<string, unknown>);
      await requestRoute.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: requestBodies.length === 1 ? null : 'A general-knowledge answer.',
          matches: [],
          hasContext: false,
          needsFallbackDecision: requestBodies.length === 1,
          message: null,
        }),
      });
    });
    await openHydratedPage(page);

    await page.getByRole('checkbox', { name: 'Fallback to General Knowledge' }).uncheck();
    await page.getByRole('textbox', { name: 'Question' }).fill('Who was Calvin Coolidge?');
    await page.getByRole('button', { name: 'Ask' }).click();

    await expect(page.getByText('No Pinecone results were found and general knowledge is off.')).toBeVisible();
    await page.getByRole('button', { name: 'Retry With General Knowledge' }).click();
    await expect(page.getByText('A general-knowledge answer.')).toBeVisible();
    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[0]).toMatchObject({ fallbackToGeneralKnowledge: false });
    expect(requestBodies[1]).toMatchObject({ fallbackToGeneralKnowledge: true });
  });

  test('shows an API error and clears previous results', async ({ page }) => {
    await mockAnswer(page, {
      answer: null,
      matches: [],
      hasContext: false,
      needsFallbackDecision: false,
      message: null,
      error: 'Pinecone is unavailable',
    }, 503);
    await openHydratedPage(page);

    await page.getByRole('textbox', { name: 'Question' }).fill('A question');
    await page.getByRole('button', { name: 'Ask' }).click();

    await expect(page.getByText('Pinecone is unavailable')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Answer' })).toHaveCount(0);
  });
});
