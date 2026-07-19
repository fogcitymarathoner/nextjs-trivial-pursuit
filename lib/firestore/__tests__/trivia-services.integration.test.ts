// lib/firestore/tests/trivia-services.integration.test.ts
import {
    questionService,
    quizService,
    resultService,
    userProfileService,
} from '../triviaService';

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Trivia Services Integration Tests', () => {
    let testQuestionId: string;
    let testQuizId: string;
    const testUserId = 'test-user-123';

    beforeAll(async () => {
        // Clean up any existing test data
        try {
            await questionService.deleteQuestion('test-question');
            await quizService.deleteQuiz('test-quiz');
        } catch {
            // Ignore cleanup errors
        }
    });

    afterAll(async () => {
        // Clean up test data
        try {
            await questionService.deleteQuestion('test-question');
            await quizService.deleteQuiz('test-quiz');
        } catch {
            // Ignore cleanup errors
        }
    });

    it('should create and retrieve a question', async () => {
        const questionData = {
            category: 'Science',
            question: 'Integration test question?',
            correctAnswer: 'A',
            incorrectAnswers: ['B', 'C', 'D'],
            difficulty: 'easy' as const,
        };

        const id = await questionService.createQuestion(questionData);
        expect(id).toBeDefined();

        const question = await questionService.getQuestion(id);
        expect(question).toBeDefined();
        expect(question?.question).toBe(questionData.question);
        expect(question?.category).toBe(questionData.category);
        expect(question?.createdAt).toBeInstanceOf(Date);

        testQuestionId = id;
    });

    it('should create and retrieve a quiz', async () => {
        const quizData = {
            title: 'Integration Test Quiz',
            description: 'Test description',
            creatorId: testUserId,
            questions: [testQuestionId],
            isPublic: true,
            category: 'Science',
            difficulty: 'medium' as const,
            timeLimit: 300,
        };

        const id = await quizService.createQuiz(quizData);
        expect(id).toBeDefined();

        const quiz = await quizService.getQuiz(id);
        expect(quiz).toBeDefined();
        expect(quiz?.title).toBe(quizData.title);
        expect(quiz?.questions).toContain(testQuestionId);

        testQuizId = id;
    });

    it('should submit and retrieve a result', async () => {
        const resultData = {
            quizId: testQuizId,
            userId: testUserId,
            score: 8,
            totalQuestions: 10,
            answers: [
                { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
                { questionId: 'q2', selectedAnswer: 'B', isCorrect: false },
            ],
        };

        const id = await resultService.submitResult(resultData);
        expect(id).toBeDefined();

        const results = await resultService.getUserResults(testUserId);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].quizId).toBe(testQuizId);
        expect(results[0].score).toBe(8);
    });

    it('should calculate average score', async () => {
        const avg = await resultService.getAverageScore(testQuizId);
        expect(avg).toBeGreaterThanOrEqual(0);
        expect(avg).toBeLessThanOrEqual(100);
    });

    it('should create and update user profile', async () => {
        await userProfileService.createProfile({
            uid: testUserId,
            displayName: 'Test User',
            email: 'test@example.com',
            totalQuizzesTaken: 0,
            averageScore: 0,
        });

        const profile = await userProfileService.getProfile(testUserId);
        expect(profile).toBeDefined();
        expect(profile?.displayName).toBe('Test User');
        expect(profile?.totalQuizzesTaken).toBe(0);

        await userProfileService.updateProfile(testUserId, {
            displayName: 'Updated Test User',
        });

        const updated = await userProfileService.getProfile(testUserId);
        expect(updated?.displayName).toBe('Updated Test User');
    });
});
