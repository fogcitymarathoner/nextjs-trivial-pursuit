import { expect, test } from '../../fixtures';
import type { TriviaTestAdapter } from '../../../hooks/triviaTestAdapter';
// tests/lib/firestore/triviaService.spec.ts
test.describe('Trivia service browser integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            const adapter: TriviaTestAdapter = {
                getAllQuestions: async () => [{
                    id: 'question-1',
                    category: 'Science',
                    difficulty: 'easy',
                    question: 'Which planet is known as the Red Planet?',
                    correctAnswer: 'Mars',
                    incorrectAnswers: ['Earth', 'Venus', 'Jupiter'],
                    createdAt: new Date(0),
                    updatedAt: new Date(0),
                }],
                getQuiz: async id => id === 'quiz-1' ? {
                    id,
                    title: 'Space Quiz',
                    description: 'Questions about space',
                    creatorId: 'service-test-user',
                    questions: ['question-1'],
                    isPublic: true,
                    createdAt: new Date(0),
                    updatedAt: new Date(0),
                } : null,
                getQuestion: async () => ({
                    id: 'question-1',
                    category: 'Science',
                    difficulty: 'easy',
                    question: 'Which planet is known as the Red Planet?',
                    correctAnswer: 'Mars',
                    incorrectAnswers: ['Earth', 'Venus', 'Jupiter'],
                    createdAt: new Date(0),
                    updatedAt: new Date(0),
                }),
            };
            window.__TRIVIA_HOOK_TEST_ADAPTER__ = adapter;
        });
        await page.goto('/experiment/ui/use-trivia', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const input = document.querySelector('#quiz-id');
            return input !== null && Object.keys(input).some(key => key.startsWith('__reactProps$'));
        });
    });

    test('renders questions returned through the service boundary', async ({ page }) => {
        await expect(page.getByText('Which planet is known as the Red Planet?')).toBeVisible();
    });

    test('loads a quiz and its questions', async ({ page }) => {
        await page.getByLabel('Quiz ID').fill('quiz-1');
        await page.getByRole('button', { name: 'Load Quiz' }).click();
        await expect(page.getByRole('heading', { name: 'Space Quiz' })).toBeVisible();
        await expect(page.getByTestId('quiz-state').getByText('Which planet is known as the Red Planet?'))
            .toBeVisible();
    });
});
