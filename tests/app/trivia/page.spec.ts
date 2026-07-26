import { expect, test } from '../../fixtures';
import type { Page } from '@playwright/test';
import type { TriviaTestAdapter } from '../../../hooks/triviaTestAdapter';

type TestQuestion = {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
};

type QuestionResponse = {
  delay?: number;
  error?: string;
  questions?: TestQuestion[];
};

const question: TestQuestion = {
  id: 'question-1',
  category: 'Geography',
  difficulty: 'easy',
  question: 'What is the capital of France?',
  correctAnswer: 'Paris',
  incorrectAnswers: ['London', 'Berlin', 'Madrid'],
};

async function setupTriviaPage(page: Page, options: {
  createError?: string;
  responses?: QuestionResponse[];
} = {}) {
  await page.context().addCookies([{
    name: 'session',
    value: 'test-session-token',
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
  await page.route('**/api/auth/verify', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true }),
  }));
  await page.addInitScript(({ createError, responses }) => {
    const queue = [...responses];
    const adapter: TriviaTestAdapter = {
      createQuestion: async () => {
        if (createError) throw new Error(createError);
        return 'created-question';
      },
      getAllQuestions: async () => {
        const response = queue.length > 1 ? queue.shift() : queue[0];
        if (response?.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
        if (response?.error) throw new Error(response.error);
        return (response?.questions ?? []) as never[];
      },
      getQuiz: async () => null,
      getQuestion: async () => null,
    };
    window.__TRIVIA_HOOK_TEST_ADAPTER__ = adapter;
  }, {
    createError: options.createError,
    responses: options.responses ?? [{ questions: [] }],
  });

  await page.goto('/trivia', { waitUntil: 'domcontentloaded' });
}

test.describe('Trivia page', () => {
  test('shows loading while questions are requested', async ({ page }) => {
    await setupTriviaPage(page, { responses: [{ delay: 500, questions: [] }] });
    await expect(page.getByText('Loading trivia questions...')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trivia Questions' })).toHaveCount(0);
  });

  test('renders loaded question details', async ({ page }) => {
    await setupTriviaPage(page, { responses: [{ questions: [question] }] });

    await expect(page.getByText(question.question)).toBeVisible();
    await expect(page.getByText('Category: Geography | Difficulty: easy')).toBeVisible();
    await expect(page.getByText('Correct: Paris')).toBeVisible();
    for (const answer of question.incorrectAnswers) {
      await expect(page.getByText(answer, { exact: true })).toBeVisible();
    }
  });

  test('renders an empty question list', async ({ page }) => {
    await setupTriviaPage(page);
    await expect(page.getByRole('heading', { name: 'Trivia Questions' })).toBeVisible();
    await expect(page.locator('.space-y-4 > div')).toHaveCount(0);
  });

  test('renders a question-loading error', async ({ page }) => {
    await setupTriviaPage(page, { responses: [{ error: 'Question service unavailable' }] });
    await expect(page.getByText('Error: Question service unavailable')).toBeVisible();
  });

  test('adds a sample question and refreshes the list', async ({ page }) => {
    const sampleQuestion: TestQuestion = {
      id: 'question-2',
      category: 'Science',
      difficulty: 'medium',
      question: 'What is the chemical symbol for water?',
      correctAnswer: 'H2O',
      incorrectAnswers: ['CO2', 'NaCl', 'HCl'],
    };
    await setupTriviaPage(page, {
      responses: [{ questions: [question] }, { delay: 200, questions: [question, sampleQuestion] }],
    });
    await expect(page.getByText(question.question)).toBeVisible();

    await page.getByRole('button', { name: 'Add Sample Question' }).click();

    await expect(page.getByText(sampleQuestion.question)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.space-y-4 > div')).toHaveCount(2, { timeout: 15000 });
  });

  test('logs an add-question failure without replacing the list', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await setupTriviaPage(page, {
      createError: 'Create failed',
      responses: [{ questions: [question] }],
    });

    await page.getByRole('button', { name: 'Add Sample Question' }).click();

    await expect(page.getByText(question.question)).toBeVisible();
    await expect.poll(() => errors.some(message => message.includes('Error adding question')))
      .toBe(true);
  });
});
