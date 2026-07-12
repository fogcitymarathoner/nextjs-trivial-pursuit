// lib/firestore/tests/trivia-services.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- Firebase SDK snapshots and references are intentionally partial test doubles. */
// Mock Firebase modules
jest.mock('firebase/firestore');
jest.mock('../../firebase/client', () => ({
    db: {
        _delegate: {
            name: 'mock-firestore',
        },
        type: 'firestore',
    },
}));

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/client';
import {
    questionService,
    quizService,
    resultService,
    userProfileService,
} from '../triviaService';
import { QuizResult, UserProfile } from '../triviaTypes';

// Type the mocks
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;

// Mock Timestamp
const mockTimestampNow = jest.fn();
(Timestamp as any).now = mockTimestampNow;

describe('Trivia Services', () => {
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();
        console.log = jest.fn();
        mockTimestampNow.mockReturnValue({
            toDate: () => new Date('2024-01-01T00:00:00Z'),
            seconds: 1704067200,
            nanoseconds: 0,
        });
    });

    afterAll(() => {
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
    });

    // Mock data
    const mockResult: QuizResult = {
        id: 'result1',
        quizId: 'quiz1',
        userId: 'user1',
        score: 8,
        totalQuestions: 10,
        answers: [
            { questionId: 'q1', selectedAnswer: 'H2O', isCorrect: true },
            { questionId: 'q2', selectedAnswer: 'Oxygen', isCorrect: false },
        ],
        completedAt: new Date(),
    };

    const mockUserProfile: UserProfile = {
        id: 'user1',
        uid: 'user1',
        displayName: 'John Doe',
        email: 'john@example.com',
        totalQuizzesTaken: 5,
        averageScore: 75,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('Question Service', () => {
        describe('createQuestion', () => {
            it('should create a question with timestamps', async () => {
                const mockDocRef = { id: 'new-question-id' };
                mockAddDoc.mockResolvedValue(mockDocRef as any);
                mockCollection.mockReturnValue({} as any);

                const questionData = {
                    category: 'Science',
                    question: 'What is the speed of light?',
                    correctAnswer: '299,792,458 m/s',
                    incorrectAnswers: ['300,000 km/s', '186,000 mph', '3x10^8 m/s'],
                    difficulty: 'hard' as const,
                };

                const result = await questionService.createQuestion(questionData);

                expect(result).toBe('new-question-id');
                expect(mockCollection).toHaveBeenCalledWith(db, 'questions');
                expect(mockAddDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        ...questionData,
                        createdAt: expect.anything(),
                        updatedAt: expect.anything(),
                    })
                );
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to create question');
                mockAddDoc.mockRejectedValue(error);

                await expect(
                    questionService.createQuestion({
                        category: 'Science',
                        question: 'Test',
                        correctAnswer: 'A',
                        incorrectAnswers: ['B', 'C', 'D'],
                        difficulty: 'easy',
                    })
                ).rejects.toThrow('Failed to create question');

                expect(console.error).toHaveBeenCalled();
            });
        });

        describe('getQuestion', () => {
            it('should get a question by ID', async () => {
                const mockDocSnap = {
                    exists: () => true,
                    id: 'q1',
                    data: () => ({
                        category: 'Science',
                        question: 'What is the chemical symbol for water?',
                        options: ['H2O', 'CO2', 'NaCl', 'HCl'],
                        correctAnswer: 'H2O',
                        difficulty: 'easy',
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    }),
                };
                mockGetDoc.mockResolvedValue(mockDocSnap as any);
                mockDoc.mockReturnValue({} as any);

                const result = await questionService.getQuestion('q1');

                expect(result).toMatchObject({
                    id: 'q1',
                    category: 'Science',
                    question: 'What is the chemical symbol for water?',
                    correctAnswer: 'H2O',
                });
                expect(result?.createdAt).toBeInstanceOf(Date);
                expect(result?.updatedAt).toBeInstanceOf(Date);
            });

            it('should return null if question not found', async () => {
                const mockDocSnap = { exists: () => false };
                mockGetDoc.mockResolvedValue(mockDocSnap as any);

                const result = await questionService.getQuestion('nonexistent');

                expect(result).toBeNull();
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to get question');
                mockGetDoc.mockRejectedValue(error);

                await expect(questionService.getQuestion('q1')).rejects.toThrow(
                    'Failed to get question'
                );
            });
        });

        describe('getAllQuestions', () => {
            it('should get all questions', async () => {
                const mockDocs = [
                    {
                        id: 'q1',
                        data: () => ({
                            category: 'Science',
                            question: 'Q1',
                            options: ['A', 'B'],
                            correctAnswer: 'A',
                            difficulty: 'easy',
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        }),
                    },
                    {
                        id: 'q2',
                        data: () => ({
                            category: 'Math',
                            question: 'Q2',
                            options: ['C', 'D'],
                            correctAnswer: 'C',
                            difficulty: 'medium',
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        }),
                    },
                ];
                const mockQuerySnapshot = { docs: mockDocs };
                mockGetDocs.mockResolvedValue(mockQuerySnapshot as any);
                mockCollection.mockReturnValue({} as any);

                const result = await questionService.getAllQuestions();

                expect(result).toHaveLength(2);
                expect(result[0]).toHaveProperty('id', 'q1');
                expect(result[1]).toHaveProperty('id', 'q2');
                expect(result[0].createdAt).toBeInstanceOf(Date);
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to get questions');
                mockGetDocs.mockRejectedValue(error);

                await expect(questionService.getAllQuestions()).rejects.toThrow(
                    'Failed to get questions'
                );
            });
        });

        describe('getQuestionsByCategory', () => {
            it('should get questions by category', async () => {
                const mockDocs = [
                    {
                        id: 'q1',
                        data: () => ({
                            category: 'Science',
                            question: 'Science Q1',
                            options: ['A', 'B'],
                            correctAnswer: 'A',
                            difficulty: 'easy',
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        }),
                    },
                ];
                mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
                mockCollection.mockReturnValue({} as any);
                mockQuery.mockReturnValue({} as any);

                const result = await questionService.getQuestionsByCategory('Science');

                expect(result).toHaveLength(1);
                expect(result[0].category).toBe('Science');
                expect(mockWhere).toHaveBeenCalledWith('category', '==', 'Science');
            });
        });

        describe('getQuestionsByDifficulty', () => {
            it('should get questions by difficulty', async () => {
                const mockDocs = [
                    {
                        id: 'q1',
                        data: () => ({
                            category: 'Science',
                            question: 'Easy Q',
                            options: ['A', 'B'],
                            correctAnswer: 'A',
                            difficulty: 'easy',
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        }),
                    },
                ];
                mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
                mockCollection.mockReturnValue({} as any);
                mockQuery.mockReturnValue({} as any);

                const result = await questionService.getQuestionsByDifficulty('easy');

                expect(result).toHaveLength(1);
                expect(result[0].difficulty).toBe('easy');
                expect(mockWhere).toHaveBeenCalledWith('difficulty', '==', 'easy');
            });
        });

        describe('updateQuestion', () => {
            it('should update a question', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);
                mockDoc.mockReturnValue({} as any);

                await questionService.updateQuestion('q1', {
                    question: 'Updated question?',
                });

                expect(mockDoc).toHaveBeenCalledWith(db, 'questions', 'q1');
                expect(mockUpdateDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        question: 'Updated question?',
                        updatedAt: expect.anything(),
                    })
                );
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to update question');
                mockUpdateDoc.mockRejectedValue(error);

                await expect(
                    questionService.updateQuestion('q1', { question: 'Test' })
                ).rejects.toThrow('Failed to update question');
            });
        });

        describe('deleteQuestion', () => {
            it('should delete a question', async () => {
                mockDeleteDoc.mockResolvedValue(undefined);
                mockDoc.mockReturnValue({} as any);

                await questionService.deleteQuestion('q1');

                expect(mockDoc).toHaveBeenCalledWith(db, 'questions', 'q1');
                expect(mockDeleteDoc).toHaveBeenCalled();
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to delete question');
                mockDeleteDoc.mockRejectedValue(error);

                await expect(questionService.deleteQuestion('q1')).rejects.toThrow(
                    'Failed to delete question'
                );
            });
        });
    });

    describe('Quiz Service', () => {
        describe('createQuiz', () => {
            it('should create a quiz with timestamps', async () => {
                const mockDocRef = { id: 'new-quiz-id' };
                mockAddDoc.mockResolvedValue(mockDocRef as any);
                mockCollection.mockReturnValue({} as any);

                const quizData = {
                    title: 'New Quiz',
                    description: 'Test description',
                    creatorId: 'user1',
                    questions: ['q1', 'q2'],
                    isPublic: true,
                    category: 'Science',
                    difficulty: 'medium' as const,
                    timeLimit: 300,
                };

                const result = await quizService.createQuiz(quizData);

                expect(result).toBe('new-quiz-id');
                expect(mockAddDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        ...quizData,
                        createdAt: expect.anything(),
                        updatedAt: expect.anything(),
                    })
                );
            });
        });

        describe('getQuiz', () => {
            it('should get a quiz by ID', async () => {
                const mockDocSnap = {
                    exists: () => true,
                    id: 'quiz1',
                    data: () => ({
                        title: 'Science Quiz',
                        description: 'Test description',
                        creatorId: 'user1',
                        questions: ['q1', 'q2'],
                        isPublic: true,
                        category: 'Science',
                        difficulty: 'medium',
                        timeLimit: 300,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    }),
                };
                mockGetDoc.mockResolvedValue(mockDocSnap as any);
                mockDoc.mockReturnValue({} as any);

                const result = await quizService.getQuiz('quiz1');

                expect(result).toMatchObject({
                    id: 'quiz1',
                    title: 'Science Quiz',
                    isPublic: true,
                });
                expect(result?.createdAt).toBeInstanceOf(Date);
            });

            it('should return null if quiz not found', async () => {
                const mockDocSnap = { exists: () => false };
                mockGetDoc.mockResolvedValue(mockDocSnap as any);

                const result = await quizService.getQuiz('nonexistent');

                expect(result).toBeNull();
            });
        });

        describe('getAllQuizzes', () => {
            it('should get all public quizzes', async () => {
                const mockDocs = [
                    {
                        id: 'quiz1',
                        data: () => ({
                            title: 'Public Quiz',
                            isPublic: true,
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        }),
                    },
                ];
                mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
                mockCollection.mockReturnValue({} as any);
                mockQuery.mockReturnValue({} as any);

                const result = await quizService.getAllQuizzes();

                expect(result).toHaveLength(1);
                expect(mockWhere).toHaveBeenCalledWith('isPublic', '==', true);
                expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
            });
        });

        describe('getQuizzesByCreator', () => {
            it('should get quizzes by creator', async () => {
                const mockDocs = [
                    {
                        id: 'quiz1',
                        data: () => ({
                            title: 'My Quiz',
                            creatorId: 'user1',
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        }),
                    },
                ];
                mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
                mockCollection.mockReturnValue({} as any);
                mockQuery.mockReturnValue({} as any);

                const result = await quizService.getQuizzesByCreator('user1');

                expect(result).toHaveLength(1);
                expect(result[0].creatorId).toBe('user1');
                expect(mockWhere).toHaveBeenCalledWith('creatorId', '==', 'user1');
            });
        });

        describe('updateQuiz', () => {
            it('should update a quiz', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);
                mockDoc.mockReturnValue({} as any);

                await quizService.updateQuiz('quiz1', { title: 'Updated Quiz' });

                expect(mockUpdateDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        title: 'Updated Quiz',
                        updatedAt: expect.anything(),
                    })
                );
            });
        });

        describe('deleteQuiz', () => {
            it('should delete a quiz', async () => {
                mockDeleteDoc.mockResolvedValue(undefined);
                mockDoc.mockReturnValue({} as any);

                await quizService.deleteQuiz('quiz1');

                expect(mockDoc).toHaveBeenCalledWith(db, 'quizzes', 'quiz1');
                expect(mockDeleteDoc).toHaveBeenCalled();
            });
        });
    });

    describe('Result Service', () => {
        describe('submitResult', () => {
            it('should submit a result with timestamp', async () => {
                const mockDocRef = { id: 'result1' };
                mockAddDoc.mockResolvedValue(mockDocRef as any);
                mockCollection.mockReturnValue({} as any);

                const resultData = {
                    quizId: 'quiz1',
                    userId: 'user1',
                    score: 1,
                    totalQuestions: 10,
                    answers: [
                        { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
                        { questionId: 'q2', selectedAnswer: 'B', isCorrect: false },
                    ],
                };

                const result = await resultService.submitResult(resultData);

                expect(result).toBe('result1');
                expect(mockAddDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        ...resultData,
                        completedAt: expect.anything(),
                    })
                );
            });
        });

        describe('getUserResults', () => {
            it('should get results for a user', async () => {
                const mockDocs = [
                    {
                        id: 'result1',
                        data: () => ({
                            quizId: 'quiz1',
                            userId: 'user1',
                            score: 80,
                            completedAt: Timestamp.now(),
                        }),
                    },
                ];
                mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
                mockCollection.mockReturnValue({} as any);
                mockQuery.mockReturnValue({} as any);

                const results = await resultService.getUserResults('user1');

                expect(results).toHaveLength(1);
                expect(results[0].userId).toBe('user1');
                expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user1');
                expect(mockOrderBy).toHaveBeenCalledWith('completedAt', 'desc');
            });
        });

        describe('getQuizResults', () => {
            it('should get results for a quiz sorted by score', async () => {
                const mockDocs = [
                    {
                        id: 'result1',
                        data: () => ({
                            quizId: 'quiz1',
                            userId: 'user1',
                            score: 90,
                            completedAt: Timestamp.now(),
                        }),
                    },
                    {
                        id: 'result2',
                        data: () => ({
                            quizId: 'quiz1',
                            userId: 'user2',
                            score: 70,
                            completedAt: Timestamp.now(),
                        }),
                    },
                ];
                mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
                mockCollection.mockReturnValue({} as any);
                mockQuery.mockReturnValue({} as any);

                const results = await resultService.getQuizResults('quiz1');

                expect(results).toHaveLength(2);
                expect(mockWhere).toHaveBeenCalledWith('quizId', '==', 'quiz1');
                expect(mockOrderBy).toHaveBeenCalledWith('score', 'desc');
            });
        });

        describe('getAverageScore', () => {
            it('should calculate average score for a quiz', async () => {
                // Mock getQuizResults to return results
                jest.spyOn(resultService, 'getQuizResults').mockResolvedValue([
                    { ...mockResult, score: 90 },
                    { ...mockResult, score: 80 },
                    { ...mockResult, score: 70 },
                ]);

                const average = await resultService.getAverageScore('quiz1');

                expect(average).toBe(80);
            });

            it('should return 0 when no results exist', async () => {
                jest.spyOn(resultService, 'getQuizResults').mockResolvedValue([]);

                const average = await resultService.getAverageScore('quiz1');

                expect(average).toBe(0);
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to get average');
                jest.spyOn(resultService, 'getQuizResults').mockRejectedValue(error);

                await expect(resultService.getAverageScore('quiz1')).rejects.toThrow(
                    'Failed to get average'
                );
            });
        });
    });

    describe('User Profile Service', () => {
        describe('createProfile', () => {
            it('should create a user profile', async () => {
                mockSetDoc.mockResolvedValue(undefined);
                mockDoc.mockReturnValue({} as any);

                const profileData = {
                    uid: 'user1',
                    displayName: 'John Doe',
                    email: 'john@example.com',
                    totalQuizzesTaken: 0,
                    averageScore: 0,
                };

                await userProfileService.createProfile(profileData);

                expect(mockDoc).toHaveBeenCalledWith(db, 'users', 'user1');
                expect(mockSetDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        ...profileData,
                        totalQuizzesTaken: 0,
                        averageScore: 0,
                        createdAt: expect.anything(),
                        updatedAt: expect.anything(),
                    })
                );
            });
        });

        describe('getProfile', () => {
            it('should get a user profile', async () => {
                const mockDocSnap = {
                    exists: () => true,
                    id: 'user1',
                    data: () => ({
                        uid: 'user1',
                        displayName: 'John Doe',
                        email: 'john@example.com',
                        totalQuizzesTaken: 5,
                        averageScore: 75,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    }),
                };
                mockGetDoc.mockResolvedValue(mockDocSnap as any);
                mockDoc.mockReturnValue({} as any);

                const result = await userProfileService.getProfile('user1');

                expect(result).toMatchObject({
                    id: 'user1',
                    displayName: 'John Doe',
                    totalQuizzesTaken: 5,
                    averageScore: 75,
                });
                expect(result?.createdAt).toBeInstanceOf(Date);
            });

            it('should return null if profile not found', async () => {
                const mockDocSnap = { exists: () => false };
                mockGetDoc.mockResolvedValue(mockDocSnap as any);

                const result = await userProfileService.getProfile('nonexistent');

                expect(result).toBeNull();
            });
        });

        describe('updateProfile', () => {
            it('should update a user profile', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);
                mockDoc.mockReturnValue({} as any);

                await userProfileService.updateProfile('user1', {
                    displayName: 'Updated Name',
                });

                expect(mockUpdateDoc).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        displayName: 'Updated Name',
                        updatedAt: expect.anything(),
                    })
                );
            });
        });

        describe('updateStats', () => {
            it('should update user stats after a quiz', async () => {
                // Mock getProfile
                jest.spyOn(userProfileService, 'getProfile').mockResolvedValue({
                    ...mockUserProfile,
                    totalQuizzesTaken: 5,
                    averageScore: 75,
                });

                // Mock updateProfile
                jest.spyOn(userProfileService, 'updateProfile').mockResolvedValue(undefined);

                await userProfileService.updateStats('user1', 8, 10);

                expect(userProfileService.updateProfile).toHaveBeenCalledWith(
                    'user1',
                    expect.objectContaining({
                        totalQuizzesTaken: 6,
                        averageScore: expect.any(Number),
                    })
                );
            });

            it('should handle missing profile', async () => {
                jest.spyOn(userProfileService, 'getProfile').mockResolvedValue(null);

                await expect(
                    userProfileService.updateStats('user1', 8, 10)
                ).resolves.not.toThrow();
            });

            it('should handle errors', async () => {
                const error = new Error('Failed to update stats');
                jest.spyOn(userProfileService, 'getProfile').mockRejectedValue(error);

                await expect(
                    userProfileService.updateStats('user1', 8, 10)
                ).rejects.toThrow('Failed to update stats');
            });
        });
    });
});
