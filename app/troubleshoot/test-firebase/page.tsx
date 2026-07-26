'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { TestFirebaseAdapter } from './testAdapter';

const getTestAdapter = (): TestFirebaseAdapter | undefined => process.env.NODE_ENV !== 'production'
    || process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === 'true'
    ? window.__TEST_FIREBASE_ADAPTER__
    : undefined;

export default function TestFirebase() {
    const [status, setStatus] = useState('Testing...');

    useEffect(() => {
        async function test() {
            try {
                const testAdapter = getTestAdapter();
                if (testAdapter) {
                    const productCount = await testAdapter.getProductCount();
                    setStatus(`✅ Connected! Found ${productCount} products`);
                    if (productCount === 0) {
                        await testAdapter.createProduct();
                        setStatus('✅ Created test product!');
                    }
                    return;
                }

                const productsRef = collection(db, 'products');
                const snapshot = await getDocs(productsRef);
                setStatus(`✅ Connected! Found ${snapshot.size} products`);
                if (snapshot.size === 0) {
                    await addDoc(productsRef, {
                        name: 'Test Product',
                        price: 9.99,
                        description: 'Auto-created test',
                        category: 'Test',
                        inStock: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    setStatus('✅ Created test product!');
                }
            } catch (error) {
                setStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
                console.error('Test error:', error);
            }
        }

        void test();
    }, []);

    return <div className="p-8">{status}</div>;
}
