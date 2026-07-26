'use client';
// app/trivia/page.tsx
import React from 'react';
import { useTriviaQuestions } from '../../hooks/useTrivia';
import { questionService } from '../../lib/firestore/triviaService';

export default function TriviaPage() {
    const { questions, loading, error, refresh } = useTriviaQuestions();
    const handleAddSampleQuestion = async () => {
        try {
            const questionData = {
                category: 'Science',
                difficulty: 'medium' as const,
                question: 'What is the chemical symbol for water?',
                correctAnswer: 'H2O',
                incorrectAnswers: ['CO2', 'NaCl', 'HCl'],
            };
            const testCreateQuestion = process.env.NODE_ENV !== 'production'
                || process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === 'true'
                ? window.__TRIVIA_HOOK_TEST_ADAPTER__?.createQuestion
                : undefined;
            await (testCreateQuestion?.(questionData)
                ?? questionService.createQuestion(questionData));
            refresh();
        } catch (err) {
            console.error('Error adding question:', err);
        }
    };

    if (loading) return <div>Loading trivia questions...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Trivia Questions</h1>

    <button
    onClick={handleAddSampleQuestion}
    className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        >
        Add Sample Question
    </button>

    <div className="space-y-4">
        {questions.map((question) => (
                <div key={question.id} className="border p-4 rounded">
            <h3 className="font-semibold">{question.question}</h3>
                <p className="text-sm text-gray-600">
                Category: {question.category} | Difficulty: {question.difficulty}
    </p>
    <p className="text-green-600">Correct: {question.correctAnswer}</p>
    <ul className="text-red-600">
        {question.incorrectAnswers.map((answer, i) => (
                <li key={i}>{answer}</li>
            ))}
        </ul>
        </div>
))}
    </div>
    </div>
);
}
