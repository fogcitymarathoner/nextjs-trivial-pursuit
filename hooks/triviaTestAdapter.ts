import type { Question, Quiz } from '../lib/firestore/triviaTypes';

export type TriviaTestAdapter = {
    createQuestion?: (data: Omit<Question, 'createdAt' | 'updatedAt'>) => Promise<string>;
    getAllQuestions: () => Promise<Question[]>;
    getQuiz: (id: string) => Promise<Quiz | null>;
    getQuestion: (id: string) => Promise<Question | null>;
};

declare global {
    interface Window {
        __TRIVIA_HOOK_TEST_ADAPTER__?: TriviaTestAdapter;
    }
}
