// app/experiment/products/page.tsx
'use client';
// test harness for products lists component
import { ProductList } from '@/components/product/ProductList';
import { testFirebaseConnection } from "@/lib/firebase/test";
import { useEffect, useState } from 'react';
import type { FirebaseTestOutcome } from './testAdapter';

async function connectToFirebase() {
    if (process.env.NODE_ENV !== 'production') {
        const outcome: FirebaseTestOutcome | undefined = window.__PRODUCTS_FIREBASE_TEST_OUTCOMES__?.shift();
        if (outcome) {
            if (outcome.delay) {
                await new Promise((resolve) => setTimeout(resolve, outcome.delay));
            }
            if (outcome.type === 'reject') {
                throw outcome.message ? new Error(outcome.message) : {};
            }
            return;
        }
    }

    const connected = await testFirebaseConnection();
    if (!connected) {
        throw new Error('Failed to connect to Firebase');
    }
}

export default function ProductPage() {
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        queueMicrotask(() => {
          setConnectionStatus('connecting');
          connectToFirebase()
            .then(() => {
                setConnectionStatus('connected');
                console.log('✅ Firebase connection successful');
            })
            .catch((error) => {
                setConnectionStatus('error');
                setErrorMessage(error?.message || 'Failed to connect to Firebase');
                console.error('❌ Firebase connection failed:', error);
            });
        });
    }, []);

    return (
        <main className="app-page" data-testid="product-page">
            <div className="app-container">
                <header className="page-heading">
                    <h1 className="page-title" data-testid="page-title">Products List</h1>
                    <p className="page-description" data-testid="page-description">
                        Test harness for Firestore products document in trivia database.
                    </p>
                </header>

                {/* Removed surface-panel-compact to allow full width */}
                <section className="surface-panel surface-panel-spacious" data-testid="product-list-container">
                    {/* Loading state */}
                    {connectionStatus === 'connecting' && (
                        <div data-testid="connection-loading" className="flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                                <p className="text-gray-600">Connecting to Firebase...</p>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {connectionStatus === 'error' && (
                        <div data-testid="connection-error" className="p-4 bg-red-50 border border-red-200 rounded-md">
                            <h3 className="text-red-800 font-semibold mb-2">Connection Error</h3>
                            <p className="text-red-600">{errorMessage}</p>
                            <button
                                onClick={() => {
                                    setConnectionStatus('connecting');
                                    connectToFirebase()
                                        .then(() => {
                                            setConnectionStatus('connected');
                                            console.log('✅ Firebase connection successful');
                                        })
                                        .catch((err) => {
                                            setConnectionStatus('error');
                                            setErrorMessage(err?.message || 'Failed to connect to Firebase');
                                        });
                                }}
                                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                data-testid="retry-button"
                            >
                                Retry Connection
                            </button>
                        </div>
                    )}

                    {/* Connected state - show ProductList */}
                    {connectionStatus === 'connected' && (
                        <div data-testid="product-list">
                            <ProductList />
                        </div>
                    )}

                    {/* Idle state (initial render) */}
                    {connectionStatus === 'idle' && (
                        <div data-testid="connection-idle" className="text-center p-8">
                            <p className="text-gray-600">Initializing connection...</p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
