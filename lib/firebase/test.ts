// lib/firebase/test.ts
import { db } from './client';
import { collection, getDocs } from 'firebase/firestore';

export async function testFirebaseConnection() {
    try {
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        console.log('✅ Firebase connection successful!');
        return true;
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);
        return false;
    }
}