// app/test-firebase/page.tsx
'use client';

import { db } from '@/lib/firebase/client';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function TestFirebase() {
    const [status, setStatus] = useState('Testing...');

    useEffect(() => {
        async function test() {
            try {
                // Test read
                const productsRef = collection(db, 'products');
                const snapshot = await getDocs(productsRef);
                setStatus(`✅ Connected! Found ${snapshot.size} products`);

                // If no products, create one
                if (snapshot.size === 0) {
                    await addDoc(productsRef, {
                        name: 'Test Product',
                        price: 9.99,
                        description: 'Auto-created test',
                        category: 'Test',
                        inStock: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    setStatus('✅ Created test product!');
                }
            } catch (error) {
                setStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
                console.error('Test error:', error);
            }
        }

        test();
    }, []);

    return <div className="p-8">{status}</div>;
}