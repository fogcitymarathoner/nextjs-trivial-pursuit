'use client';
// hooks/useTrivia.ts
import { useCallback, useEffect, useState } from 'react';
import { questionService, quizService } from '../lib/firestore/triviaService';
import { Question, Quiz } from '../lib/firestore/triviaTypes';

export function useTriviaQuestions() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadQuestions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await questionService.getAllQuestions();
            setQuestions(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;

        void questionService.getAllQuestions()
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

        void quizService.getQuiz(quizId)
            .then(async (quizData) => {
                if (!quizData) {
                    if (!ignore) {
                        setQuiz(null);
                        setQuestions([]);
                    }
                    return;
                }

                const questionResults = await Promise.allSettled(
                    quizData.questions.map((id) => questionService.getQuestion(id)),
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
