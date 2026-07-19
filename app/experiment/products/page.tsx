'use client';
// app/experiment/products/page.tsx
// test harness for products lists component
import { ProductList } from '@/components/product/ProductList';
import { testFirebaseConnection } from "@/lib/firebase/test";
import { useEffect } from 'react';

export default function ProductPage() {
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

                {/* Removed surface-panel-compact to allow full width */}
                <section className="surface-panel surface-panel-spacious">
                    <ProductList />
                </section>
            </div>
        </main>
    );
}