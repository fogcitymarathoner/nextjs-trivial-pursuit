// lib/firestore/tests/triviaTypes.guards.test.ts

import {
    Question,
    Quiz,
    QuizResult,
    UserProfile,
} from '../triviaTypes';

// Type guard functions
const isQuestion = (obj: any): obj is Question => {
    return Boolean(
        obj &&
        typeof obj === 'object' &&
        typeof obj.category === 'string' &&
        typeof obj.difficulty === 'string' &&
        ['easy', 'medium', 'hard'].includes(obj.difficulty) &&
        typeof obj.question === 'string' &&
        typeof obj.correctAnswer === 'string' &&
        Array.isArray(obj.incorrectAnswers) &&
        obj.incorrectAnswers.length >= 3 &&
        obj.createdAt instanceof Date &&
        obj.updatedAt instanceof Date
    );
};

const isQuiz = (obj: any): obj is Quiz => {
    return Boolean(
        obj &&
        typeof obj === 'object' &&
        typeof obj.title === 'string' &&
        typeof obj.description === 'string' &&
        typeof obj.creatorId === 'string' &&
        Array.isArray(obj.questions) &&
        typeof obj.isPublic === 'boolean' &&
        obj.createdAt instanceof Date &&
        obj.updatedAt instanceof Date
    );
};

const isQuizResult = (obj: any): obj is QuizResult => {
    return Boolean(
        obj &&
        typeof obj === 'object' &&
        typeof obj.quizId === 'string' &&
        typeof obj.userId === 'string' &&
        typeof obj.score === 'number' &&
        typeof obj.totalQuestions === 'number' &&
        Array.isArray(obj.answers) &&
        obj.answers.every((a: any) =>
            typeof a.questionId === 'string' &&
            typeof a.selectedAnswer === 'string' &&
            typeof a.isCorrect === 'boolean'
        ) &&
        obj.completedAt instanceof Date
    );
};

const isUserProfile = (obj: any): obj is UserProfile => {
    return Boolean(
        obj &&
        typeof obj === 'object' &&
        typeof obj.uid === 'string' &&
        typeof obj.email === 'string' &&
        typeof obj.displayName === 'string' &&
        typeof obj.totalQuizzesTaken === 'number' &&
        typeof obj.averageScore === 'number' &&
        obj.totalQuizzesTaken >= 0 &&
        obj.averageScore >= 0 &&
        obj.averageScore <= 100 &&
        obj.createdAt instanceof Date &&
        obj.updatedAt instanceof Date
    );
};

describe('Type Guards', () => {
    describe('isQuestion', () => {
        it('should return true for valid Question object', () => {
            const validQuestion: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'Test?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isQuestion(validQuestion)).toBe(true);
        });

        it('should return false for invalid Question objects', () => {
            expect(isQuestion(null)).toBe(false);
            expect(isQuestion(undefined)).toBe(false);
            expect(isQuestion({})).toBe(false);
            expect(isQuestion({ category: 'Science' })).toBe(false);
            expect(isQuestion({
                category: 'Science',
                difficulty: 'invalid',
                question: 'Test?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date(),
                updatedAt: new Date(),
            })).toBe(false);
        });
    });

    describe('isQuiz', () => {
        it('should return true for valid Quiz object', () => {
            const validQuiz: Quiz = {
                id: 'quiz1',
                title: 'Test Quiz',
                description: 'Test description',
                creatorId: 'user1',
                questions: ['q1', 'q2'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isQuiz(validQuiz)).toBe(true);
        });

        it('should return false for invalid Quiz objects', () => {
            expect(isQuiz(null)).toBe(false);
            expect(isQuiz(undefined)).toBe(false);
            expect(isQuiz({})).toBe(false);
            expect(isQuiz({ title: 'Test' })).toBe(false);
        });
    });

    describe('isQuizResult', () => {
        it('should return true for valid QuizResult object', () => {
            const validResult: QuizResult = {
                id: 'result1',
                quizId: 'quiz1',
                userId: 'user1',
                score: 80,
                totalQuestions: 10,
                answers: [
                    { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
                    { questionId: 'q2', selectedAnswer: 'B', isCorrect: false },
                ],
                completedAt: new Date(),
            };

            expect(isQuizResult(validResult)).toBe(true);
        });

        it('should return false for invalid QuizResult objects', () => {
            expect(isQuizResult(null)).toBe(false);
            expect(isQuizResult(undefined)).toBe(false);
            expect(isQuizResult({})).toBe(false);
            expect(isQuizResult({ quizId: 'quiz1' })).toBe(false);
        });
    });

    describe('isUserProfile', () => {
        it('should return true for valid UserProfile object', () => {
            const validProfile: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 5,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isUserProfile(validProfile)).toBe(true);
        });

        it('should return false for invalid UserProfile objects', () => {
            expect(isUserProfile(null)).toBe(false);
            expect(isUserProfile(undefined)).toBe(false);
            expect(isUserProfile({})).toBe(false);
            expect(isUserProfile({ uid: 'user1' })).toBe(false);
            expect(isUserProfile({
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: -1,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            })).toBe(false);
        });
    });
});
