// hooks/tests/useTrivia.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTriviaQuestions, useTriviaQuiz } from '../useTrivia';
import { questionService, quizService } from '../../lib/firestore/triviaService';
import type { Question, Quiz } from '../../lib/firestore/triviaTypes';

// Mock the services
jest.mock('../../lib/firestore/triviaService', () => ({
    questionService: {
        getAllQuestions: jest.fn(),
        getQuestion: jest.fn(),
    },
    quizService: {
        getQuiz: jest.fn(),
    },
}));

// Mock the Question and Quiz types
const mockQuestion: Question = {
    id: 'q1',
    category: 'Science',
    difficulty: 'easy',
    question: 'What is the chemical symbol for water?',
    correctAnswer: 'H2O',
    incorrectAnswers: ['CO2', 'NaCl', 'HCl'],
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockQuestion2: Question = {
    id: 'q2',
    category: 'Science',
    difficulty: 'medium',
    question: 'What is the speed of light?',
    correctAnswer: '299,792,458 m/s',
    incorrectAnswers: ['300,000 km/s', '186,000 mph', '3x10^8 m/s'],
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockQuiz: Quiz = {
    id: 'quiz1',
    title: 'Science Quiz',
    description: 'Test your science knowledge',
    creatorId: 'user1',
    questions: ['q1', 'q2'],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('useTriviaQuestions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (questionService.getAllQuestions as jest.Mock).mockReturnValue(
            new Promise<Question[]>(() => undefined),
        );
    });

    it('should initialize with loading state', () => {
        const { result } = renderHook(() => useTriviaQuestions());

        expect(result.current.loading).toBe(true);
        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('should fetch questions on mount', async () => {
        const mockQuestions = [mockQuestion, mockQuestion2];
        (questionService.getAllQuestions as jest.Mock).mockResolvedValue(mockQuestions);

        const { result } = renderHook(() => useTriviaQuestions());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.questions).toEqual(mockQuestions);
        expect(result.current.error).toBeNull();
        expect(questionService.getAllQuestions).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching questions', async () => {
        const mockError = new Error('Failed to fetch questions');
        (questionService.getAllQuestions as jest.Mock).mockRejectedValue(mockError);

        const { result } = renderHook(() => useTriviaQuestions());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toEqual(mockError);
        expect(questionService.getAllQuestions).toHaveBeenCalledTimes(1);
    });

    it('should not update state if component unmounts', async () => {
        const mockQuestions = [mockQuestion];
        let resolvePromise: (value: Question[]) => void;
        const promise = new Promise<Question[]>((resolve) => {
            resolvePromise = resolve;
        });
        (questionService.getAllQuestions as jest.Mock).mockReturnValue(promise);

        const { result, unmount } = renderHook(() => useTriviaQuestions());

        // Unmount before the promise resolves
        unmount();

        // Resolve the promise after unmount
        await act(async () => {
            resolvePromise!(mockQuestions);
            await promise;
        });

        // State should not be updated
        expect(result.current.loading).toBe(true);
        expect(result.current.questions).toEqual([]);
    });

    it('should refresh questions when refresh is called', async () => {
        const initialQuestions = [mockQuestion];
        const updatedQuestions = [mockQuestion, mockQuestion2];

        // First call returns initial questions
        (questionService.getAllQuestions as jest.Mock)
            .mockResolvedValueOnce(initialQuestions)
            .mockResolvedValueOnce(updatedQuestions);

        const { result } = renderHook(() => useTriviaQuestions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.questions).toEqual(initialQuestions);
        expect(questionService.getAllQuestions).toHaveBeenCalledTimes(1);

        // Call refresh
        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.questions).toEqual(updatedQuestions);
        expect(questionService.getAllQuestions).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during refresh', async () => {
        const mockQuestions = [mockQuestion];
        const mockError = new Error('Refresh failed');

        (questionService.getAllQuestions as jest.Mock)
            .mockResolvedValueOnce(mockQuestions)
            .mockRejectedValueOnce(mockError);

        const { result } = renderHook(() => useTriviaQuestions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBeNull();

        // Call refresh and handle error
        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.error).toEqual(mockError);
        expect(result.current.questions).toEqual(mockQuestions);
    });

    it('should set loading state during refresh', async () => {
        const mockQuestions = [mockQuestion];
        let resolvePromise: (value: Question[]) => void;
        const promise = new Promise<Question[]>((resolve) => {
            resolvePromise = resolve;
        });

        (questionService.getAllQuestions as jest.Mock)
            .mockResolvedValueOnce(mockQuestions)
            .mockReturnValueOnce(promise);

        const { result } = renderHook(() => useTriviaQuestions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Call refresh
        let refreshPromise: Promise<void>;
        await act(async () => {
            refreshPromise = result.current.refresh();
        });

        // Should be loading during refresh
        expect(result.current.loading).toBe(true);

        // Resolve the promise
        await act(async () => {
            resolvePromise!([mockQuestion, mockQuestion2]);
            await refreshPromise;
        });

        expect(result.current.loading).toBe(false);
    });

    it('should handle multiple rapid refreshes', async () => {
        const mockQuestions = [mockQuestion];
        let resolvePromise: (value: Question[]) => void;
        const promise = new Promise<Question[]>((resolve) => {
            resolvePromise = resolve;
        });

        (questionService.getAllQuestions as jest.Mock)
            .mockResolvedValueOnce(mockQuestions)
            .mockReturnValueOnce(promise)
            .mockResolvedValueOnce([mockQuestion, mockQuestion2]);

        const { result } = renderHook(() => useTriviaQuestions());

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Call refresh twice
        let refreshPromise1: Promise<void>;
        let refreshPromise2: Promise<void>;
        await act(async () => {
            refreshPromise1 = result.current.refresh();
            refreshPromise2 = result.current.refresh();
        });

        // Resolve the promise
        await act(async () => {
            resolvePromise!([mockQuestion, mockQuestion2]);
            await Promise.all([refreshPromise1, refreshPromise2]);
        });

        // Should have the updated questions
        expect(result.current.questions).toEqual([mockQuestion, mockQuestion2]);
    });
});

describe('useTriviaQuiz', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (quizService.getQuiz as jest.Mock).mockReturnValue(
            new Promise<Quiz | null>(() => undefined),
        );
    });

    it('should initialize with loading state', () => {
        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        expect(result.current.loading).toBe(true);
        expect(result.current.quiz).toBeNull();
        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('should fetch quiz and questions on mount', async () => {
        (quizService.getQuiz as jest.Mock).mockResolvedValue(mockQuiz);
        (questionService.getQuestion as jest.Mock)
            .mockResolvedValueOnce(mockQuestion)
            .mockResolvedValueOnce(mockQuestion2);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.quiz).toEqual(mockQuiz);
        expect(result.current.questions).toEqual([mockQuestion, mockQuestion2]);
        expect(result.current.error).toBeNull();
        expect(quizService.getQuiz).toHaveBeenCalledWith('quiz1');
        expect(questionService.getQuestion).toHaveBeenCalledTimes(2);
        expect(questionService.getQuestion).toHaveBeenCalledWith('q1');
        expect(questionService.getQuestion).toHaveBeenCalledWith('q2');
    });

    it('should handle quiz not found', async () => {
        (quizService.getQuiz as jest.Mock).mockResolvedValue(null);
        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result } = renderHook(() => useTriviaQuiz('nonexistent'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.quiz).toBeNull();
        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toBeNull();
        expect(quizService.getQuiz).toHaveBeenCalledWith('nonexistent');
        expect(questionService.getQuestion).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching quiz', async () => {
        const mockError = new Error('Failed to fetch quiz');
        (quizService.getQuiz as jest.Mock).mockRejectedValue(mockError);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.quiz).toBeNull();
        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toEqual(mockError);
        expect(quizService.getQuiz).toHaveBeenCalledWith('quiz1');
        expect(questionService.getQuestion).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching questions', async () => {
        const mockError = new Error('Failed to fetch question');
        (quizService.getQuiz as jest.Mock).mockResolvedValue(mockQuiz);
        (questionService.getQuestion as jest.Mock)
            .mockResolvedValueOnce(mockQuestion)
            .mockRejectedValueOnce(mockError);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // The hook should still have the quiz but only the successfully fetched questions
        expect(result.current.quiz).toEqual(mockQuiz);
        expect(result.current.questions).toEqual([mockQuestion]);
        expect(result.current.error).toEqual(mockError);
        expect(questionService.getQuestion).toHaveBeenCalledTimes(2);
    });

    it('should handle partial question fetching failures', async () => {
        (quizService.getQuiz as jest.Mock).mockResolvedValue(mockQuiz);
        (questionService.getQuestion as jest.Mock)
            .mockResolvedValueOnce(mockQuestion)
            .mockResolvedValueOnce(null);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should filter out null questions
        expect(result.current.quiz).toEqual(mockQuiz);
        expect(result.current.questions).toEqual([mockQuestion]);
        expect(result.current.error).toBeNull();
    });

    it('should not fetch questions if quizId is empty', async () => {
        const { result } = renderHook(() => useTriviaQuiz(''));

        // Should not make any API calls
        expect(quizService.getQuiz).not.toHaveBeenCalled();
        expect(questionService.getQuestion).not.toHaveBeenCalled();

        // Should remain in loading state (or you might want to handle this differently)
        expect(result.current.loading).toBe(true);
    });

    it('should not update state if component unmounts', async () => {
        let resolveQuizPromise: (value: Quiz) => void;
        const quizPromise = new Promise<Quiz>((resolve) => {
            resolveQuizPromise = resolve;
        });

        (quizService.getQuiz as jest.Mock).mockReturnValue(quizPromise);
        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result, unmount } = renderHook(() => useTriviaQuiz('quiz1'));

        // Unmount before the promise resolves
        unmount();

        // Resolve the promise after unmount
        await act(async () => {
            resolveQuizPromise!(mockQuiz);
            await quizPromise;
        });

        // State should not be updated
        expect(result.current.loading).toBe(true);
        expect(result.current.quiz).toBeNull();
        expect(result.current.questions).toEqual([]);
    });

    it('should fetch questions in parallel', async () => {
        (quizService.getQuiz as jest.Mock).mockResolvedValue(mockQuiz);
        (questionService.getQuestion as jest.Mock)
            .mockResolvedValueOnce(mockQuestion)
            .mockResolvedValueOnce(mockQuestion2);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Verify both questions were fetched
        expect(questionService.getQuestion).toHaveBeenCalledTimes(2);
        expect(result.current.questions).toHaveLength(2);
    });

    it('should handle quiz with no questions', async () => {
        const emptyQuiz: Quiz = {
            ...mockQuiz,
            questions: [],
        };

        (quizService.getQuiz as jest.Mock).mockResolvedValue(emptyQuiz);
        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.quiz).toEqual(emptyQuiz);
        expect(result.current.questions).toEqual([]);
        expect(questionService.getQuestion).not.toHaveBeenCalled();
    });

    it('should refetch when quizId changes', async () => {
        (quizService.getQuiz as jest.Mock)
            .mockResolvedValueOnce(mockQuiz)
            .mockResolvedValueOnce({ ...mockQuiz, id: 'quiz2', title: 'New Quiz' });
        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result, rerender } = renderHook(
            ({ quizId }) => useTriviaQuiz(quizId),
            { initialProps: { quizId: 'quiz1' } }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.quiz?.id).toBe('quiz1');
        expect(quizService.getQuiz).toHaveBeenCalledTimes(1);

        // Change quizId
        rerender({ quizId: 'quiz2' });

        await waitFor(() => {
            expect(result.current.quiz?.id).toBe('quiz2');
        });

        expect(result.current.quiz?.id).toBe('quiz2');
        expect(quizService.getQuiz).toHaveBeenCalledTimes(2);
    });

    it('should handle race conditions with multiple quizId changes', async () => {
        let resolveFirstQuiz: (value: Quiz) => void;
        const firstQuizPromise = new Promise<Quiz>((resolve) => {
            resolveFirstQuiz = resolve;
        });

        let resolveSecondQuiz: (value: Quiz) => void;
        const secondQuizPromise = new Promise<Quiz>((resolve) => {
            resolveSecondQuiz = resolve;
        });

        // First call returns a slow promise
        (quizService.getQuiz as jest.Mock)
            .mockReturnValueOnce(firstQuizPromise)
            .mockReturnValueOnce(secondQuizPromise);

        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result, rerender } = renderHook(
            ({ quizId }) => useTriviaQuiz(quizId),
            { initialProps: { quizId: 'quiz1' } }
        );

        // Change quizId before first resolves
        rerender({ quizId: 'quiz2' });

        // Resolve second quiz (should be the final result)
        await act(async () => {
            resolveSecondQuiz!({ ...mockQuiz, id: 'quiz2' });
            await secondQuizPromise;
        });

        // Resolve first quiz (should be ignored)
        await act(async () => {
            resolveFirstQuiz!({ ...mockQuiz, id: 'quiz1' });
            await firstQuizPromise;
        });

        // Should have the second quiz data
        expect(result.current.quiz?.id).toBe('quiz2');
    });
});

describe('useTriviaQuiz - Edge Cases', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should handle duplicate question IDs', async () => {
        const quizWithDuplicates: Quiz = {
            ...mockQuiz,
            questions: ['q1', 'q1', 'q2'],
        };

        (quizService.getQuiz as jest.Mock).mockResolvedValue(quizWithDuplicates);
        (questionService.getQuestion as jest.Mock)
            .mockResolvedValueOnce(mockQuestion)
            .mockResolvedValueOnce(mockQuestion2);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should still fetch all questions, including duplicates
        expect(questionService.getQuestion).toHaveBeenCalledTimes(3);
        expect(result.current.questions).toHaveLength(2); // Filtered out nulls
    });

    it('should handle very large number of questions', async () => {
        const manyQuestions = Array.from({ length: 100 }, (_, i) => `q${i}`);
        const largeQuiz: Quiz = {
            ...mockQuiz,
            questions: manyQuestions,
        };

        (quizService.getQuiz as jest.Mock).mockResolvedValue(largeQuiz);
        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result } = renderHook(() => useTriviaQuiz('quiz1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(questionService.getQuestion).toHaveBeenCalledTimes(100);
        expect(result.current.questions).toHaveLength(100);
    });

    it('should handle special characters in quizId', async () => {
        const specialQuizId = 'quiz-123_abc!@#';
        (quizService.getQuiz as jest.Mock).mockResolvedValue(mockQuiz);
        (questionService.getQuestion as jest.Mock).mockResolvedValue(mockQuestion);

        const { result } = renderHook(() => useTriviaQuiz(specialQuizId));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(quizService.getQuiz).toHaveBeenCalledWith(specialQuizId);
    });
});
