// tests/hooks/useTrivia.spec.ts
import { expect, test } from '../fixtures';
import type { Page } from '@playwright/test';
import type { TriviaTestAdapter } from '../../hooks/triviaTestAdapter';

type ResponseValue = { delay?: number; error?: string; value?: unknown };

const question = (id: string, text: string) => ({
  id,
  category: 'Science',
  difficulty: 'easy' as const,
  question: text,
  correctAnswer: 'Correct',
  incorrectAnswers: ['Wrong'],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

async function setupAdapter(page: Page, options: {
  questionResponses?: ResponseValue[];
  quizzes?: Record<string, ResponseValue>;
  quizQuestions?: Record<string, ResponseValue>;
} = {}) {
  await page.addInitScript(({ questionResponses, quizzes, quizQuestions }) => {
    const responses = [...questionResponses];
    const resolveResponse = async (response: ResponseValue | undefined) => {
      if (response?.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
      if (response?.error) throw new Error(response.error);
      return response?.value ?? null;
    };

    const adapter: TriviaTestAdapter = {
      getAllQuestions: async () => {
        const response = responses.length > 1 ? responses.shift() : responses[0];
        return await resolveResponse(response) as never[];
      },
      getQuiz: async id => await resolveResponse(quizzes[id]) as never,
      getQuestion: async id => await resolveResponse(quizQuestions[id]) as never,
    };
    window.__TRIVIA_HOOK_TEST_ADAPTER__ = adapter;
  }, {
    questionResponses: options.questionResponses ?? [{ value: [] }],
    quizzes: options.quizzes ?? {},
    quizQuestions: options.quizQuestions ?? {},
  });

  await page.goto('/experiment/ui/use-trivia', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const input = document.querySelector('#quiz-id');
    return input !== null && Object.keys(input).some(key => key.startsWith('__reactProps$'));
  });
}

async function loadQuiz(page: Page, id: string) {
  await page.getByLabel('Quiz ID').fill(id);
  await page.getByRole('button', { name: 'Load Quiz' }).click();
}

test.describe('useTrivia', () => {
  test('loads questions and refreshes them', async ({ page }) => {
    await setupAdapter(page, {
      questionResponses: [
        { value: [question('q1', 'Initial question?')] },
        { value: [question('q2', 'Refreshed question?')] },
      ],
    });

    await expect(page.getByText('Initial question?')).toBeVisible();
    await page.getByRole('button', { name: 'Refresh Questions' }).click();
    await expect(page.getByText('Refreshed question?')).toBeVisible();
    await expect(page.getByText('Initial question?')).toHaveCount(0);
  });

  test('shows loading and recovers from a questions error', async ({ page }) => {
    await setupAdapter(page, {
      questionResponses: [
        { delay: 300, error: 'Question service unavailable' },
        { value: [question('q1', 'Recovered question?')] },
      ],
    });

    await expect(page.getByText('Loading questions...')).toBeVisible();
    await expect(page.getByText('Questions error: Question service unavailable')).toBeVisible();
    await page.getByRole('button', { name: 'Refresh Questions' }).click();
    await expect(page.getByText('Recovered question?')).toBeVisible();
  });

  test('does nothing until a quiz id is selected and handles a missing quiz', async ({ page }) => {
    await setupAdapter(page, { quizzes: { missing: { value: null } } });
    await expect(page.getByText('No quiz selected.')).toBeVisible();

    await loadQuiz(page, 'missing');

    await expect(page.getByText('Quiz not found.')).toBeVisible();
  });

  test('loads a quiz and keeps fulfilled questions when one lookup fails', async ({ page }) => {
    await setupAdapter(page, {
      quizzes: {
        quiz1: { value: {
          id: 'quiz1',
          title: 'Science Quiz',
          description: 'A quiz',
          creatorId: 'user1',
          questions: ['q1', 'q2'],
          isPublic: true,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        } },
      },
      quizQuestions: {
        q1: { value: question('q1', 'What is water?') },
        q2: { error: 'Question q2 unavailable' },
      },
    });

    await loadQuiz(page, 'quiz1');

    await expect(page.getByRole('heading', { name: 'Science Quiz' })).toBeVisible();
    await expect(page.getByText('What is water?')).toBeVisible();
    await expect(page.getByText('Quiz error: Question q2 unavailable')).toBeVisible();
  });

  test('shows a quiz-loading error', async ({ page }) => {
    await setupAdapter(page, {
      quizzes: { broken: { delay: 300, error: 'Quiz service unavailable' } },
    });

    await loadQuiz(page, 'broken');
    await expect(page.getByText('Loading quiz...')).toBeVisible();
    await expect(page.getByText('Quiz error: Quiz service unavailable')).toBeVisible();
  });
});
