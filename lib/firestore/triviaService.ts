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
    DocumentData,
    setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { Question, Quiz, QuizResult, UserProfile } from './triviaTypes';

type TimestampLike = {
    toDate: () => Date;
};

const isTimestampLike = (value: unknown): value is TimestampLike =>
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function';

// Generic helper functions
const convertTimestamps = (data: DocumentData) => {
    const result = { ...data };
    for (const key in result) {
        if (isTimestampLike(result[key])) {
            result[key] = result[key].toDate();
        }
    }
    return result;
};

// Questions Service
export const questionService = {
    async createQuestion(data: Omit<Question, 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, 'questions'), {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating question:', error);
            throw error;
        }
    },

    async getQuestion(id: string): Promise<Question | null> {
        try {
            const docRef = doc(db, 'questions', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...convertTimestamps(docSnap.data())
                } as Question;
            }
            return null;
        } catch (error) {
            console.error('Error getting question:', error);
            throw error;
        }
    },

    async getAllQuestions(): Promise<Question[]> {
        try {
            const querySnapshot = await getDocs(collection(db, 'questions'));
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as Question[];
        } catch (error) {
            console.error('Error getting questions:', error);
            throw error;
        }
    },

    async getQuestionsByCategory(category: string): Promise<Question[]> {
        try {
            const q = query(
                collection(db, 'questions'),
                where('category', '==', category)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as Question[];
        } catch (error) {
            console.error('Error getting questions by category:', error);
            throw error;
        }
    },

    async getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<Question[]> {
        try {
            const q = query(
                collection(db, 'questions'),
                where('difficulty', '==', difficulty)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as Question[];
        } catch (error) {
            console.error('Error getting questions by difficulty:', error);
            throw error;
        }
    },

    async updateQuestion(id: string, data: Partial<Question>): Promise<void> {
        try {
            const docRef = doc(db, 'questions', id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating question:', error);
            throw error;
        }
    },

    async deleteQuestion(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'questions', id));
        } catch (error) {
            console.error('Error deleting question:', error);
            throw error;
        }
    },
};

// Quizzes Service
export const quizService = {
    async createQuiz(data: Omit<Quiz, 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, 'quizzes'), {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating quiz:', error);
            throw error;
        }
    },

    async getQuiz(id: string): Promise<Quiz | null> {
        try {
            const docRef = doc(db, 'quizzes', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...convertTimestamps(docSnap.data())
                } as Quiz;
            }
            return null;
        } catch (error) {
            console.error('Error getting quiz:', error);
            throw error;
        }
    },

    async getAllQuizzes(): Promise<Quiz[]> {
        try {
            const q = query(
                collection(db, 'quizzes'),
                where('isPublic', '==', true),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as Quiz[];
        } catch (error) {
            console.error('Error getting quizzes:', error);
            throw error;
        }
    },

    async getQuizzesByCreator(creatorId: string): Promise<Quiz[]> {
        try {
            const q = query(
                collection(db, 'quizzes'),
                where('creatorId', '==', creatorId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as Quiz[];
        } catch (error) {
            console.error('Error getting quizzes by creator:', error);
            throw error;
        }
    },

    async updateQuiz(id: string, data: Partial<Quiz>): Promise<void> {
        try {
            const docRef = doc(db, 'quizzes', id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating quiz:', error);
            throw error;
        }
    },

    async deleteQuiz(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'quizzes', id));
        } catch (error) {
            console.error('Error deleting quiz:', error);
            throw error;
        }
    },
};

// Quiz Results Service
export const resultService = {
    async submitResult(data: Omit<QuizResult, 'completedAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, 'results'), {
                ...data,
                completedAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error submitting result:', error);
            throw error;
        }
    },

    async getUserResults(userId: string): Promise<QuizResult[]> {
        try {
            const q = query(
                collection(db, 'results'),
                where('userId', '==', userId),
                orderBy('completedAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as QuizResult[];
        } catch (error) {
            console.error('Error getting user results:', error);
            throw error;
        }
    },

    async getQuizResults(quizId: string): Promise<QuizResult[]> {
        try {
            const q = query(
                collection(db, 'results'),
                where('quizId', '==', quizId),
                orderBy('score', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data()),
            })) as QuizResult[];
        } catch (error) {
            console.error('Error getting quiz results:', error);
            throw error;
        }
    },

    async getAverageScore(quizId: string): Promise<number> {
        try {
            const results = await this.getQuizResults(quizId);
            if (results.length === 0) return 0;
            const totalScore = results.reduce((sum, r) => sum + r.score, 0);
            return totalScore / results.length;
        } catch (error) {
            console.error('Error getting average score:', error);
            throw error;
        }
    },
};

// User Profile Service
export const userProfileService = {
    async createProfile(data: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
        try {
            await setDoc(doc(db, 'users', data.uid), {
                ...data,
                totalQuizzesTaken: 0,
                averageScore: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    },

    async getProfile(uid: string): Promise<UserProfile | null> {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...convertTimestamps(docSnap.data())
                } as UserProfile;
            }
            return null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    },

    async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
        try {
            const docRef = doc(db, 'users', uid);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    async updateStats(uid: string, score: number, totalQuestions: number): Promise<void> {
        try {
            const profile = await this.getProfile(uid);
            if (!profile) return;

            const percentage = (score / totalQuestions) * 100;
            const newTotal = profile.totalQuizzesTaken + 1;
            const newAverage = ((profile.averageScore * profile.totalQuizzesTaken) + percentage) / newTotal;

            await this.updateProfile(uid, {
                totalQuizzesTaken: newTotal,
                averageScore: newAverage,
            });
        } catch (error) {
            console.error('Error updating user stats:', error);
            throw error;
        }
    },
};
