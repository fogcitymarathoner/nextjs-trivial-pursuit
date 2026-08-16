// scripts/listQuestions.ts
// To run - npx tsx scripts/listQuestions.ts
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Next.js uses.env.local

import * as admin from 'firebase-admin';

// Initialize Admin - uses GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY
function getAdminDb() {
    if (admin.apps.length) {
        return admin.firestore();
    }

    // Option A: If you have a service account JSON path in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
    } else {
        // Option B: Fallback to projectId only (works if you ran `gcloud auth application-default login`)
        // You need to set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (!projectId) throw new Error('Missing FIREBASE_PROJECT_ID or service account');
        admin.initializeApp({ projectId });
    }

    const db = admin.firestore();
    // If you use a custom database ID (from firestoreDatabaseId)
    // const db = admin.firestore(); db.settings({ databaseId: 'your-db-id' }) // if needed
    return db;
}

type TimestampLike = { toDate: () => Date };
const isTimestampLike = (v: unknown): v is TimestampLike =>
    typeof v === 'object' && v!== null && 'toDate' in v && typeof (v as any).toDate === 'function';

const convertTimestamps = (data: FirebaseFirestore.DocumentData) => {
    const res = {...data };
    for (const k in res) {
        if (isTimestampLike(res[k])) res[k] = res[k].toDate();
    }
    return res;
};

async function getAllQuestions() {
    const db = getAdminDb();
    console.log('✅ Connected to project:', db.projectId);

    const snap = await db.collection('questions').get();

    if (snap.empty) {
        console.log('No questions found');
        return [];
    }

    const questions = snap.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
    }));

    return questions;
}

async function main() {
    const questions = await getAllQuestions();
    console.log(`\nFound ${questions.length} questions`);
    console.log(JSON.stringify(questions, null, 2));

    // Optional: save to file
    // const fs = require('fs');
    // fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});