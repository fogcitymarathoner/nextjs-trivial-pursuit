// hooks/tests/useTrivia.integration.test.ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTriviaQuestions, useTriviaQuiz } from '../useTrivia';
import { questionService, quizService } from '../../lib/firestore/triviaService';

// This test suite is for integration testing with real Firebase
// Only run if environment variables are set
const shouldRunIntegration = Boolean(
    process.env.RUN_INTEGRATION_TESTS === 'true' &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
);
const describeIntegration = shouldRunIntegration ? describe : describe.skip;

describeIntegration('useTrivia Integration Tests', () => {
    let testQuizId = '';
    let testQuestionIds: string[] = [];

    beforeAll(async () => {
        // Create test data
        const q1Id = await questionService.createQuestion({
            category: 'Integration',
            question: 'Integration test question 1?',
            correctAnswer: 'A',
            incorrectAnswers: ['B', 'C', 'D'],
            difficulty: 'easy',
        });

        const q2Id = await questionService.createQuestion({
            category: 'Integration',
            question: 'Integration test question 2?',
            correctAnswer: 'B',
            incorrectAnswers: ['A', 'C', 'D'],
            difficulty: 'medium',
        });

        testQuestionIds = [q1Id, q2Id];

        testQuizId = await quizService.createQuiz({
            title: 'Integration Test Quiz',
            description: 'Test description',
            creatorId: 'test-user',
            questions: testQuestionIds,
            isPublic: true,
        });
    });

    afterAll(async () => {
        // Cleanup test data
        if (testQuizId) {
            await quizService.deleteQuiz(testQuizId);
        }
        await Promise.all(testQuestionIds.map(id => questionService.deleteQuestion(id)));
    });

    it('should fetch all questions', async () => {
        const { result } = renderHook(() => useTriviaQuestions());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.questions.length).toBeGreaterThanOrEqual(2);

        // Check if our test questions are included
        const questionIds = result.current.questions.map(q => q.id);
        expect(questionIds).toContain(testQuestionIds[0]);
        expect(questionIds).toContain(testQuestionIds[1]);
    });

    it('should fetch a quiz with its questions', async () => {
        const { result } = renderHook(() => useTriviaQuiz(testQuizId));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.quiz).toBeDefined();
        expect(result.current.quiz?.id).toBe(testQuizId);
        expect(result.current.questions).toHaveLength(2);
        expect(result.current.questions[0].id).toBe(testQuestionIds[0]);
        expect(result.current.questions[1].id).toBe(testQuestionIds[1]);
    });

    it('should refresh questions', async () => {
        const { result } = renderHook(() => useTriviaQuestions());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const initialCount = result.current.questions.length;

        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.questions.length).toBe(initialCount);
        expect(result.current.error).toBeNull();
    });
});
