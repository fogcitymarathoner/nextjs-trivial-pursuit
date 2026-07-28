'use client';
// hooks/useTrivia.ts
import { useCallback, useEffect, useState } from 'react';
import { questionService, quizService } from '../lib/firestore/triviaService';
import { Question, Quiz } from '../lib/firestore/triviaTypes';
import type { TriviaTestAdapter } from './triviaTestAdapter';

export type { TriviaTestAdapter } from './triviaTestAdapter';

const getTestAdapter = (): TriviaTestAdapter | undefined => process.env.NODE_ENV !== 'production'
    || process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === 'true'
    ? window.__TRIVIA_HOOK_TEST_ADAPTER__
    : undefined;

const getAllQuestions = () => getTestAdapter()?.getAllQuestions()
    ?? questionService.getAllQuestions();
const getQuiz = (id: string) => getTestAdapter()?.getQuiz(id)
    ?? quizService.getQuiz(id);
const getQuestion = (id: string) => getTestAdapter()?.getQuestion(id)
    ?? questionService.getQuestion(id);

export function useTriviaQuestions() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadQuestions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAllQuestions();
            setQuestions(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;

        void getAllQuestions()
            .then((data) => {
                if (!ignore) setQuestions(data);
            })
            .catch((err) => {
                if (!ignore) setError(err as Error);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, []);

    return { questions, loading, error, refresh: loadQuestions };
}

export function useTriviaQuiz(quizId: string) {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let ignore = false;

        if (!quizId) {
            return () => {
                ignore = true;
            };
        }

        queueMicrotask(() => {
            if (!ignore) {
                setLoading(true);
                setError(null);
            }
        });

        void getQuiz(quizId)
            .then(async (quizData) => {
                if (!quizData) {
                    if (!ignore) {
                        setQuiz(null);
                        setQuestions([]);
                    }
                    return;
                }

                const questionResults = await Promise.allSettled(
                    quizData.questions.map((id) => getQuestion(id)),
                );
                const questionData = questionResults
                    .filter((result) => result.status === 'fulfilled')
                    .map((result) => result.value)
                    .filter((question): question is Question => question != null);
                const failedQuestion = questionResults.find(
                    (result) => result.status === 'rejected',
                );

                if (!ignore) {
                    setQuiz(quizData);
                    setQuestions(questionData);
                    if (failedQuestion?.status === 'rejected') {
                        setError(failedQuestion.reason as Error);
                    }
                }
            })
            .catch((err) => {
                if (!ignore) setError(err as Error);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [quizId]);

    return { quiz, questions, loading, error };
}
