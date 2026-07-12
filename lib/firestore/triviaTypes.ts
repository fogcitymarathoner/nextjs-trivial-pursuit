// lib/firestore/triviaTypes.ts

// Types for your trivia app
export interface Question {
    id?: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Quiz {
    id?: string;
    title: string;
    description: string;
    creatorId: string;
    questions: string[]; // Array of question IDs
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface QuizResult {
    id?: string;
    quizId: string;
    userId: string;
    score: number;
    totalQuestions: number;
    answers: {
        questionId: string;
        selectedAnswer: string;
        isCorrect: boolean;
    }[];
    completedAt: Date;
}

export interface UserProfile {
    id?: string;
    uid: string;
    email: string;
    displayName: string;
    totalQuizzesTaken: number;
    averageScore: number;
    createdAt: Date;
    updatedAt: Date;
}
