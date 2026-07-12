'use client';
// test harness for products lists component
import {ProductList} from '@/components/ProductList';
import {testFirebaseConnection} from "@/lib/firebase/test";
import {useEffect} from 'react';

export default function ProductPage() {
    // app/page.tsx or wherever
    useEffect(() => {
        testFirebaseConnection();
    }, []);
    return (
        <main className="app-page">
            <div className="app-container">
                <header className="page-heading">
                    <h1 className="page-title">Products List</h1>
                    <p className="page-description">
                        Test harness for Firestore products document in trivia database.
                    </p>
                </header>

                <section className="surface-panel surface-panel-spacious surface-panel-compact content-stack">
                    <ProductList/>
                </section>
            </div>
        </main>
    );
}
