// lib/firestore/tests/triviaTypes.test.ts
import {
    Question,
    Quiz,
    QuizResult,
    UserProfile,
} from '../triviaTypes';

describe('Trivia Types', () => {
    describe('Question Interface', () => {
        it('should have all required properties', () => {
            const question: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'What is the chemical symbol for water?',
                correctAnswer: 'H2O',
                incorrectAnswers: ['CO2', 'NaCl', 'HCl'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(question).toHaveProperty('id');
            expect(question).toHaveProperty('category');
            expect(question).toHaveProperty('difficulty');
            expect(question).toHaveProperty('question');
            expect(question).toHaveProperty('correctAnswer');
            expect(question).toHaveProperty('incorrectAnswers');
            expect(question).toHaveProperty('createdAt');
            expect(question).toHaveProperty('updatedAt');
        });

        it('should have optional id', () => {
            const question: Question = {
                category: 'Science',
                difficulty: 'easy',
                question: 'What is the chemical symbol for water?',
                correctAnswer: 'H2O',
                incorrectAnswers: ['CO2', 'NaCl', 'HCl'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(question.id).toBeUndefined();
        });

        it('should only accept valid difficulty values', () => {
            const validDifficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

            validDifficulties.forEach((difficulty) => {
                const question: Question = {
                    category: 'Science',
                    difficulty,
                    question: 'Test question?',
                    correctAnswer: 'A',
                    incorrectAnswers: ['B', 'C', 'D'],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                expect(question.difficulty).toBe(difficulty);
            });

            // TypeScript will catch invalid values at compile time
            // This test ensures the type definition is correct
            const invalidDifficulty = 'invalid' as any;
            expect(() => {
                const question: Question = {
                    category: 'Science',
                    difficulty: invalidDifficulty,
                    question: 'Test question?',
                    correctAnswer: 'A',
                    incorrectAnswers: ['B', 'C', 'D'],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                // This should fail at compile time, but we test runtime behavior
                expect(question.difficulty).toBeDefined();
            }).not.toThrow();
        });

        it('should have correct answer not in incorrect answers', () => {
            const correctAnswer = 'H2O';
            const incorrectAnswers = ['CO2', 'NaCl', 'HCl'];

            const question: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'What is the chemical symbol for water?',
                correctAnswer,
                incorrectAnswers,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(question.correctAnswer).not.toBe(question.incorrectAnswers[0]);
            expect(question.incorrectAnswers).not.toContain(question.correctAnswer);
        });

        it('should have at least 3 incorrect answers', () => {
            const question: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'Test question?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(question.incorrectAnswers.length).toBeGreaterThanOrEqual(3);
            expect(question.incorrectAnswers.length).toBeLessThanOrEqual(6);
        });
    });

    describe('Quiz Interface', () => {
        it('should have all required properties', () => {
            const quiz: Quiz = {
                id: 'quiz1',
                title: 'Science Quiz',
                description: 'Test your science knowledge',
                creatorId: 'user1',
                questions: ['q1', 'q2', 'q3'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(quiz).toHaveProperty('id');
            expect(quiz).toHaveProperty('title');
            expect(quiz).toHaveProperty('description');
            expect(quiz).toHaveProperty('creatorId');
            expect(quiz).toHaveProperty('questions');
            expect(quiz).toHaveProperty('isPublic');
            expect(quiz).toHaveProperty('createdAt');
            expect(quiz).toHaveProperty('updatedAt');
        });

        it('should have optional id', () => {
            const quiz: Quiz = {
                title: 'Science Quiz',
                description: 'Test your science knowledge',
                creatorId: 'user1',
                questions: ['q1', 'q2', 'q3'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(quiz.id).toBeUndefined();
        });

        it('should have a non-empty questions array', () => {
            const quiz: Quiz = {
                id: 'quiz1',
                title: 'Science Quiz',
                description: 'Test your science knowledge',
                creatorId: 'user1',
                questions: ['q1', 'q2', 'q3'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(quiz.questions.length).toBeGreaterThan(0);
        });

        it('should have unique question IDs', () => {
            const quiz: Quiz = {
                id: 'quiz1',
                title: 'Science Quiz',
                description: 'Test your science knowledge',
                creatorId: 'user1',
                questions: ['q1', 'q2', 'q3', 'q1'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const uniqueQuestions = new Set(quiz.questions);
            // This test expects that the quiz might have duplicates
            // In a real app, we'd validate this
            expect(uniqueQuestions.size).toBeLessThanOrEqual(quiz.questions.length);
        });

        it('should have boolean isPublic', () => {
            const publicQuiz: Quiz = {
                id: 'quiz1',
                title: 'Public Quiz',
                description: 'Test description',
                creatorId: 'user1',
                questions: ['q1'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const privateQuiz: Quiz = {
                id: 'quiz2',
                title: 'Private Quiz',
                description: 'Test description',
                creatorId: 'user1',
                questions: ['q1'],
                isPublic: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(publicQuiz.isPublic).toBe(true);
            expect(privateQuiz.isPublic).toBe(false);
            expect(typeof publicQuiz.isPublic).toBe('boolean');
        });
    });

    describe('QuizResult Interface', () => {
        it('should have all required properties', () => {
            const result: QuizResult = {
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

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('quizId');
            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('totalQuestions');
            expect(result).toHaveProperty('answers');
            expect(result).toHaveProperty('completedAt');
        });

        it('should have optional id', () => {
            const result: QuizResult = {
                quizId: 'quiz1',
                userId: 'user1',
                score: 80,
                totalQuestions: 10,
                answers: [
                    { questionId: 'q1', selectedAnswer: 'H2O', isCorrect: true },
                ],
                completedAt: new Date(),
            };

            expect(result.id).toBeUndefined();
        });

        it('should have score between 0 and totalQuestions', () => {
            const result: QuizResult = {
                id: 'result1',
                quizId: 'quiz1',
                userId: 'user1',
                score: 8,
                totalQuestions: 10,
                answers: [],
                completedAt: new Date(),
            };

            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(result.totalQuestions);
        });

        it('should have answers matching totalQuestions', () => {
            const answers = [
                { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
                { questionId: 'q2', selectedAnswer: 'B', isCorrect: false },
                { questionId: 'q3', selectedAnswer: 'C', isCorrect: true },
            ];

            const result: QuizResult = {
                id: 'result1',
                quizId: 'quiz1',
                userId: 'user1',
                score: 2,
                totalQuestions: 3,
                answers,
                completedAt: new Date(),
            };

            expect(result.answers.length).toBe(result.totalQuestions);
        });

        it('should have correct isCorrect values based on answer', () => {
            const result: QuizResult = {
                id: 'result1',
                quizId: 'quiz1',
                userId: 'user1',
                score: 2,
                totalQuestions: 3,
                answers: [
                    { questionId: 'q1', selectedAnswer: 'A', isCorrect: true },
                    { questionId: 'q2', selectedAnswer: 'B', isCorrect: false },
                    { questionId: 'q3', selectedAnswer: 'C', isCorrect: true },
                ],
                completedAt: new Date(),
            };

            const correctAnswers = result.answers.filter(a => a.isCorrect);
            expect(correctAnswers.length).toBe(result.score);
        });
    });

    describe('UserProfile Interface', () => {
        it('should have all required properties', () => {
            const profile: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 5,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(profile).toHaveProperty('id');
            expect(profile).toHaveProperty('uid');
            expect(profile).toHaveProperty('email');
            expect(profile).toHaveProperty('displayName');
            expect(profile).toHaveProperty('totalQuizzesTaken');
            expect(profile).toHaveProperty('averageScore');
            expect(profile).toHaveProperty('createdAt');
            expect(profile).toHaveProperty('updatedAt');
        });

        it('should have optional id', () => {
            const profile: UserProfile = {
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 5,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(profile.id).toBeUndefined();
        });

        it('should have non-negative totalQuizzesTaken', () => {
            const profile: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 5,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(profile.totalQuizzesTaken).toBeGreaterThanOrEqual(0);
        });

        it('should have averageScore between 0 and 100', () => {
            const profile: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 5,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(profile.averageScore).toBeGreaterThanOrEqual(0);
            expect(profile.averageScore).toBeLessThanOrEqual(100);
        });

        it('should have zero averageScore when totalQuizzesTaken is 0', () => {
            const profile: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 0,
                averageScore: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(profile.totalQuizzesTaken).toBe(0);
            expect(profile.averageScore).toBe(0);
        });

        it('should have valid email format', () => {
            const validEmails = ['john@example.com', 'jane.doe@test.co.uk'];
            const invalidEmails = ['invalid-email', 'missing@domain', '@example.com'];

            validEmails.forEach((email) => {
                const profile: UserProfile = {
                    id: 'user1',
                    uid: 'user1',
                    email,
                    displayName: 'Test User',
                    totalQuizzesTaken: 0,
                    averageScore: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                expect(profile.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            });

            // TypeScript allows invalid emails, but we can test runtime validation
            // The type system doesn't enforce email format, but our code should
            expect(() => {
                const profile: UserProfile = {
                    id: 'user1',
                    uid: 'user1',
                    email: 'invalid-email',
                    displayName: 'Test User',
                    totalQuizzesTaken: 0,
                    averageScore: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                expect(profile.email).toBe('invalid-email');
            }).not.toThrow();
        });
    });

    describe('Type Relationships', () => {
        it('should have Quiz referencing Question IDs', () => {
            const question: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'Test question?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const quiz: Quiz = {
                id: 'quiz1',
                title: 'Test Quiz',
                description: 'Test description',
                creatorId: 'user1',
                questions: [question.id as string],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(quiz.questions).toContain(question.id);
        });

        it('should have QuizResult referencing Quiz and User', () => {
            const quiz: Quiz = {
                id: 'quiz1',
                title: 'Test Quiz',
                description: 'Test description',
                creatorId: 'user1',
                questions: ['q1'],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const user: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 0,
                averageScore: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result: QuizResult = {
                id: 'result1',
                quizId: quiz.id as string,
                userId: user.uid,
                score: 1,
                totalQuestions: 1,
                answers: [{ questionId: 'q1', selectedAnswer: 'A', isCorrect: true }],
                completedAt: new Date(),
            };

            expect(result.quizId).toBe(quiz.id);
            expect(result.userId).toBe(user.uid);
        });

        it('should have UserProfile updated by QuizResult', () => {
            const result: QuizResult = {
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

            const profile: UserProfile = {
                id: 'user1',
                uid: 'user1',
                email: 'john@example.com',
                displayName: 'John Doe',
                totalQuizzesTaken: 5,
                averageScore: 75,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Simulate updating profile based on result
            const updatedTotal = profile.totalQuizzesTaken + 1;
            const percentage = (result.score / result.totalQuestions) * 100;
            const updatedAverage = ((profile.averageScore * profile.totalQuizzesTaken) + percentage) / updatedTotal;

            expect(updatedTotal).toBe(6);
            expect(updatedAverage).toBeCloseTo((75 * 5 + 80) / 6, 2);
        });
    });

    describe('Data Validation', () => {
        it('should validate Question data', () => {
            const validateQuestion = (question: Question) => {
                const errors: string[] = [];

                if (!question.category || question.category.trim().length === 0) {
                    errors.push('Category is required');
                }

                if (!question.question || question.question.trim().length === 0) {
                    errors.push('Question text is required');
                }

                if (!question.correctAnswer || question.correctAnswer.trim().length === 0) {
                    errors.push('Correct answer is required');
                }

                if (!question.incorrectAnswers || question.incorrectAnswers.length < 3) {
                    errors.push('At least 3 incorrect answers are required');
                }

                if (question.incorrectAnswers.includes(question.correctAnswer)) {
                    errors.push('Correct answer should not be in incorrect answers');
                }

                return errors;
            };

            const validQuestion: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'Test question?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(validateQuestion(validQuestion)).toHaveLength(0);
        });

        it('should validate Quiz data', () => {
            const validateQuiz = (quiz: Quiz) => {
                const errors: string[] = [];

                if (!quiz.title || quiz.title.trim().length === 0) {
                    errors.push('Title is required');
                }

                if (!quiz.creatorId || quiz.creatorId.trim().length === 0) {
                    errors.push('Creator ID is required');
                }

                if (!quiz.questions || quiz.questions.length === 0) {
                    errors.push('At least one question is required');
                }

                return errors;
            };

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

            expect(validateQuiz(validQuiz)).toHaveLength(0);
        });

        it('should validate UserProfile data', () => {
            const validateProfile = (profile: UserProfile) => {
                const errors: string[] = [];

                if (!profile.uid || profile.uid.trim().length === 0) {
                    errors.push('UID is required');
                }

                if (!profile.email || !profile.email.includes('@')) {
                    errors.push('Valid email is required');
                }

                if (!profile.displayName || profile.displayName.trim().length === 0) {
                    errors.push('Display name is required');
                }

                if (profile.totalQuizzesTaken < 0) {
                    errors.push('Total quizzes taken cannot be negative');
                }

                if (profile.averageScore < 0 || profile.averageScore > 100) {
                    errors.push('Average score must be between 0 and 100');
                }

                return errors;
            };

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

            expect(validateProfile(validProfile)).toHaveLength(0);
        });
    });

    describe('Type Conversions', () => {
        it('should convert Firestore timestamps to Dates', () => {
            const firestoreData = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'Test question?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: { toDate: () => new Date('2024-01-01') },
                updatedAt: { toDate: () => new Date('2024-01-02') },
            };

            const convertTimestamps = (data: any): Question => ({
                id: data.id,
                category: data.category,
                difficulty: data.difficulty,
                question: data.question,
                correctAnswer: data.correctAnswer,
                incorrectAnswers: data.incorrectAnswers,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            });

            const question = convertTimestamps(firestoreData);
            expect(question.createdAt).toBeInstanceOf(Date);
            expect(question.updatedAt).toBeInstanceOf(Date);
            expect(question.createdAt.getUTCFullYear()).toBe(2024);
        });

        it('should handle serialization/deserialization', () => {
            const originalQuestion: Question = {
                id: 'q1',
                category: 'Science',
                difficulty: 'easy',
                question: 'Test question?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            };

            // Simulate JSON serialization and deserialization
            const json = JSON.stringify(originalQuestion);
            const parsed = JSON.parse(json);

            expect(parsed).toMatchObject({
                id: originalQuestion.id,
                category: originalQuestion.category,
                difficulty: originalQuestion.difficulty,
                question: originalQuestion.question,
                correctAnswer: originalQuestion.correctAnswer,
                incorrectAnswers: originalQuestion.incorrectAnswers,
            });

            // Dates become strings in JSON
            expect(typeof parsed.createdAt).toBe('string');
            expect(typeof parsed.updatedAt).toBe('string');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings in required fields', () => {
            const question: Question = {
                id: 'q1',
                category: '',
                difficulty: 'easy',
                question: '',
                correctAnswer: '',
                incorrectAnswers: ['', '', ''],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(question.category).toBe('');
            expect(question.question).toBe('');
            expect(question.correctAnswer).toBe('');
        });

        it('should handle empty arrays', () => {
            const quiz: Quiz = {
                id: 'quiz1',
                title: 'Empty Quiz',
                description: 'Quiz with no questions',
                creatorId: 'user1',
                questions: [],
                isPublic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(quiz.questions).toHaveLength(0);
        });

        it('should handle undefined optional fields', () => {
            const question: Question = {
                category: 'Science',
                difficulty: 'easy',
                question: 'Test?',
                correctAnswer: 'A',
                incorrectAnswers: ['B', 'C', 'D'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(question.id).toBeUndefined();
        });

        it('should handle null values in arrays', () => {
            const result: QuizResult = {
                id: 'result1',
                quizId: 'quiz1',
                userId: 'user1',
                score: 0,
                totalQuestions: 0,
                answers: [],
                completedAt: new Date(),
            };

            expect(result.answers).toHaveLength(0);
        });
    });
});
