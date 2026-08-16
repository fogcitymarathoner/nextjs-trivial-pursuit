// scripts/getAllQuestions.ts
// To run - npx tsx scripts/getAllQuestions.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // <-- must be FIRST

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, DocumentData } from 'firebase/firestore';
import { firebaseConfig } from '../lib/firebase/config';
import { Question } from '../lib/firestore/triviaTypes';

// Node-safe init - no persistentLocalCache
const app = getApps().length === 0? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Same helper you already have
type TimestampLike = { toDate: () => Date };
const isTimestampLike = (value: unknown): value is TimestampLike =>
    typeof value === 'object' &&
    value!== null &&
    'toDate' in value &&
    typeof (value as any).toDate === 'function';

const convertTimestamps = (data: DocumentData) => {
    const result = {...data };
    for (const key in result) {
        if (isTimestampLike(result[key])) {
            result[key] = result[key].toDate();
        }
    }
    return result;
};

/**
 * Returns ALL questions from Firestore
 */
export async function getAllQuestions(): Promise<Question[]> {
    try {
        const querySnapshot = await getDocs(collection(db, 'questions'));

        if (querySnapshot.empty) {
            console.log('No questions found');
            return [];
        }

        const questions = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...convertTimestamps(doc.data()),
        })) as Question[];

        return questions;
    } catch (error) {
        console.error('Error getting all questions:', error);
        throw error;
    }
}

// CLI runner
async function main() {
    const questions = await getAllQuestions();
    console.log(`Found ${questions.length} questions:`);
    console.log(JSON.stringify(questions, null, 2));
}

main().catch(console.error);