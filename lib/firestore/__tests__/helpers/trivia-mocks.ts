// lib/firestore/tests/helpers/trivia-mocks.ts

import { Question, Quiz, QuizResult, UserProfile } from '../../triviaTypes';

export const createMockQuestion = (overrides?: Partial<Question>): Question => ({
    id: `q-${Date.now()}`,
    category: 'Science',
    question: 'Test question?',
    correctAnswer: 'Option A',
    incorrectAnswers: ['Option B', 'Option C', 'Option D'],
    difficulty: 'easy',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockQuiz = (overrides?: Partial<Quiz>): Quiz => ({
    id: `quiz-${Date.now()}`,
    title: 'Test Quiz',
    description: 'Test description',
    creatorId: 'user-1',
    questions: ['q1', 'q2', 'q3'],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockResult = (overrides?: Partial<QuizResult>): QuizResult => ({
    id: `result-${Date.now()}`,
    quizId: 'quiz-1',
    userId: 'user-1',
    score: 8,
    totalQuestions: 10,
    answers: [
        { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
        { questionId: 'q2', selectedAnswer: 'B', isCorrect: false },
    ],
    completedAt: new Date(),
    ...overrides,
});

export const createMockUserProfile = (overrides?: Partial<UserProfile>): UserProfile => ({
    id: 'user-1',
    uid: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    totalQuizzesTaken: 5,
    averageScore: 75,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockQuestionArray = (count: number, overrides?: Partial<Question>) => {
    return Array.from({ length: count }, (_, i) =>
        createMockQuestion({
            id: `q-${i + 1}`,
            question: `Test question ${i + 1}?`,
            ...overrides,
        })
    );
};

export const createMockTimestamp = (date: Date = new Date()) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: date.getMilliseconds() * 1000000,
    toDate: () => date,
    toMillis: () => date.getTime(),
    isEqual: jest.fn(),
});

export const mockFirestoreResponse = {
    exists: true,
    data: () => ({}),
    id: 'mock-id',
};
