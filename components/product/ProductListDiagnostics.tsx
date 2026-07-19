'use client';
// components/product/ProductListDiagnostics.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { db, app } from '../../lib/firebase/client';
import { productService } from '../../lib/firestore/productService';
import { Product } from '../../lib/firestore/productTypes';
import { firebaseConfig, firestoreDatabaseId } from '../../lib/firebase/config';

interface DiagnosticInfo {
    environment: string;
    nodeEnv: string;
    firebaseProjectId: string;
    firestoreDatabaseId: string;
    authDomain: string;
    timestamp: string;
    productCount: number;
    cachedProductCount?: number;
    directQueryCount?: number;
    realtimeCount?: number;
    products: Product[];
    error?: string;
}

export const ProductListDiagnostics: React.FC = () => {
    const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);
    const [detailedLogs, setDetailedLogs] = useState<string[]>([]);

    const addLog = (message: string) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        setDetailedLogs(prev => [...prev, logMessage]);
    };

    const clearCache = async () => {
        try {
            setIsClearing(true);
            addLog('🗑️ Starting cache clear...');
            
            // Terminate the Firestore connection
            await terminate(db);
            addLog('✅ Firestore connection terminated');
            
            // Clear IndexedDB persistence
            await clearIndexedDbPersistence(db);
            addLog('✅ IndexedDB cache cleared');
            
            // Reload the page to reinitialize
            addLog('🔄 Reloading page to reinitialize Firebase...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            addLog(`❌ Error clearing cache: ${error}`);
            console.error('Error clearing cache:', error);
        } finally {
            setIsClearing(false);
        }
    };

    const loadDiagnostics = useCallback(async () => {
        try {
            setLoading(true);
            addLog('🔍 Starting firebase_diagnostics...');
            
            // Basic environment info
            const envInfo = {
                environment: process.env.NODE_ENV || 'unknown',
                nodeEnv: process.env.NODE_ENV || 'unknown',
                firebaseProjectId: firebaseConfig.projectId || 'NOT_SET',
                firestoreDatabaseId: firestoreDatabaseId,
                authDomain: firebaseConfig.authDomain || 'NOT_SET',
                timestamp: new Date().toISOString(),
            };
            
            addLog(`📋 Environment: ${JSON.stringify(envInfo, null, 2)}`);
            
            // Method 1: Using service (with cache)
            addLog('📡 Method 1: Fetching via productService.getAllProducts()...');
            const serviceProducts = await productService.getAllProducts();
            addLog(`✅ Service returned ${serviceProducts.length} products`);
            
            // Method 2: Direct Firestore query (bypasses some caching)
            addLog('📡 Method 2: Direct Firestore query...');
            const productsRef = collection(db, 'products');
            const snapshot = await getDocs(productsRef);
            const directProducts: Product[] = [];
            
            snapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() } as Product;
                directProducts.push(data);
                addLog(`  - Found product: ${doc.id} - ${data.name}`);
            });
            addLog(`✅ Direct query returned ${directProducts.length} products`);
            
            // Log any discrepancies
            if (serviceProducts.length !== directProducts.length) {
                addLog(`⚠️ DISCREPANCY DETECTED: Service (${serviceProducts.length}) vs Direct (${directProducts.length})`);
            }
            
            // Set the diagnostic data
            setDiagnostics({
                ...envInfo,
                productCount: serviceProducts.length,
                cachedProductCount: serviceProducts.length,
                directQueryCount: directProducts.length,
                realtimeCount: realtimeProducts.length,
                products: directProducts,
            });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addLog(`❌ Error in diagnostics: ${errorMessage}`);
            setDiagnostics({
                environment: process.env.NODE_ENV || 'unknown',
                nodeEnv: process.env.NODE_ENV || 'unknown',
                firebaseProjectId: firebaseConfig.projectId || 'ERROR',
                firestoreDatabaseId: firestoreDatabaseId,
                authDomain: firebaseConfig.authDomain || 'ERROR',
                timestamp: new Date().toISOString(),
                productCount: 0,
                products: [],
                error: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    }, [realtimeProducts.length]);

    // Set up real-time listener
    useEffect(() => {
        // Use console.log directly in setup to avoid setState in effect
        console.log('[' + new Date().toISOString() + '] 🔄 Setting up real-time listener...');
        
        const unsubscribe = onSnapshot(
            collection(db, 'products'),
            (snapshot) => {
                const products: Product[] = [];
                snapshot.forEach((doc) => {
                    products.push({ id: doc.id, ...doc.data() } as Product);
                });
                addLog(`📊 Real-time update: ${products.length} products`);
                setRealtimeProducts(products);
            },
            (error) => {
                addLog(`❌ Real-time listener error: ${error.message}`);
            }
        );

        return () => {
            console.log('[' + new Date().toISOString() + '] 🛑 Cleaning up real-time listener');
            unsubscribe();
        };
    }, []);

    // Load firebase_diagnostics on mount and when real-time products change
    useEffect(() => {
        // Defer the call to avoid synchronous setState
        const timer = setTimeout(() => {
            loadDiagnostics();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadDiagnostics]);

    const formatJson = (obj: Record<string, unknown>) => JSON.stringify(obj, null, 2);

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-center mt-4">Running diagnostics...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🔍 Firebase Products Diagnostics</h1>
            
            {/* Critical Info Box */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-semibold mb-2">🎯 Critical Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <strong>Project ID:</strong> 
                        <code className="ml-2 bg-white px-2 py-1 rounded">{diagnostics?.firebaseProjectId}</code>
                    </div>
                    <div>
                        <strong>Database ID:</strong> 
                        <code className="ml-2 bg-white px-2 py-1 rounded">{diagnostics?.firestoreDatabaseId}</code>
                    </div>
                    <div>
                        <strong>Environment:</strong> 
                        <code className="ml-2 bg-white px-2 py-1 rounded">{diagnostics?.environment}</code>
                    </div>
                    <div>
                        <strong>Auth Domain:</strong> 
                        <code className="ml-2 bg-white px-2 py-1 rounded">{diagnostics?.authDomain}</code>
                    </div>
                </div>
            </div>

            {/* Product Counts Comparison */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-semibold mb-2">📊 Product Count Analysis</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{diagnostics?.cachedProductCount || 0}</div>
                        <div className="text-sm text-gray-600">Service Query (Cached)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{diagnostics?.directQueryCount || 0}</div>
                        <div className="text-sm text-gray-600">Direct Query</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">{diagnostics?.realtimeCount || 0}</div>
                        <div className="text-sm text-gray-600">Real-time Listener</div>
                    </div>
                </div>
                {diagnostics && diagnostics.cachedProductCount !== diagnostics.directQueryCount && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                        <strong className="text-red-600">⚠️ Discrepancy Detected!</strong>
                        <p className="text-sm mt-1">Different product counts detected between query methods. This might indicate a cache issue or database synchronization problem.</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={loadDiagnostics}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    🔄 Refresh Diagnostics
                </button>
                <button
                    onClick={clearCache}
                    disabled={isClearing}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                    {isClearing ? '⏳ Clearing...' : '🗑️ Clear Cache & Reload'}
                </button>
            </div>

            {/* Products List */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-semibold mb-3">📦 Products in Database</h2>
                {diagnostics?.products && diagnostics.products.length > 0 ? (
                    <div className="space-y-2">
                        {diagnostics.products.map((product, index) => (
                            <div key={product.id} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono text-sm text-gray-500">#{index + 1}</span>
                                        <strong className="ml-2">{product.name}</strong>
                                        <span className="ml-2 text-gray-600">(ID: {product.id})</span>
                                    </div>
                                    <span className="text-blue-600 font-semibold">${product.price}</span>
                                </div>
                                {product.description && (
                                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                    Category: {product.category || 'N/A'} | In Stock: {product.inStock ? '✅' : '❌'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No products found in the database.</p>
                )}
            </div>

            {/* Detailed Logs */}
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-semibold mb-3 text-white">📜 Detailed Console Logs</h2>
                <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                    {detailedLogs.map((log, index) => (
                        <div key={index} className="hover:bg-gray-800 px-2 py-1 rounded">
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {/* Environment Variables */}
            <details className="bg-gray-50 rounded-lg p-4 mb-6">
                <summary className="cursor-pointer font-semibold text-lg">🔧 Environment Configuration</summary>
                <pre className="mt-3 bg-white p-3 rounded text-xs overflow-x-auto">
                    {formatJson({
                        NODE_ENV: process.env.NODE_ENV,
                        NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
                        NEXT_PUBLIC_FIRESTORE_DATABASE_ID: firestoreDatabaseId,
                        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
                        NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey ? '***SET***' : 'NOT_SET',
                        NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId ? '***SET***' : 'NOT_SET',
                    })}
                </pre>
            </details>

            {/* Error Display */}
            {diagnostics?.error && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">❌ Error Detected</h2>
                    <pre className="bg-white p-3 rounded text-sm text-red-600">{diagnostics.error}</pre>
                </div>
            )}
        </div>
    );
};

export default ProductListDiagnostics;