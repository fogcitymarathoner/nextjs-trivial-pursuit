// hooks/tests/helpers/render-hook.tsx

import { renderHook, waitFor } from '@testing-library/react';

export const renderHookWithProviders = <T,>(
    hook: () => T,
) => renderHook(hook);

// Helper to wait for loading to complete
export const waitForLoadingToComplete = async (result: {
    current: { loading: boolean };
}) => {
    await waitFor(() => {
        expect(result.current.loading).toBe(false);
    });
};

// Helper to create mock services
export const createMockServices = () => ({
    questionService: {
        getAllQuestions: jest.fn(),
        getQuestion: jest.fn(),
        createQuestion: jest.fn(),
        updateQuestion: jest.fn(),
        deleteQuestion: jest.fn(),
    },
    quizService: {
        getQuiz: jest.fn(),
        getAllQuizzes: jest.fn(),
        createQuiz: jest.fn(),
        updateQuiz: jest.fn(),
        deleteQuiz: jest.fn(),
    },
});

const hookTestHelpers = {
    renderHookWithProviders,
    waitForLoadingToComplete,
    createMockServices,
};

export default hookTestHelpers;
