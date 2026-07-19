// lib/firestore/productService.ts
import { db } from '@/lib/firebase/client';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    doc,
    deleteDoc,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Product, CreateProductInput, UpdateProductInput } from './productTypes';
import type { User } from './productTypes';

// ==================== FIRESTORE SERVICE ====================

export const firestoreService = {
    async createDocument(collectionName: string, data: any): Promise<string> {
        try {
            const collectionRef = collection(db, collectionName);
            const docRef = await addDoc(collectionRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    },

    async createDocumentWithId(collectionName: string, docId: string, data: any): Promise<void> {
        try {
            const docRef = doc(db, collectionName, docId);
            await setDoc(docRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error creating document with ID:', error);
            throw error;
        }
    },

    async getDocuments<T>(collectionName: string): Promise<T[]> {
        try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as unknown as T));
        } catch (error) {
            console.error('Error getting documents:', error);
            throw error;
        }
    },

    async getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
        try {
            const docRef = doc(db, collectionName, docId);
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) {
                return null;
            }
            return {
                id: snapshot.id,
                ...snapshot.data()
            } as unknown as T;
        } catch (error) {
            console.error('Error getting document:', error);
            throw error;
        }
    },

    async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
        try {
            const docRef = doc(db, collectionName, docId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    },

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        try {
            const docRef = doc(db, collectionName, docId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    },

    async queryDocuments<T>(collectionName: string, constraints: any[]): Promise<T[]> {
        try {
            const collectionRef = collection(db, collectionName);
            const q = query(collectionRef, ...constraints);
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as unknown as T));
        } catch (error) {
            console.error('Error querying documents:', error);
            throw error;
        }
    }
};

// ==================== PRODUCT SERVICE ====================

export const productService = {
    async getAllProducts(): Promise<Product[]> {
        try {
            const productsRef = collection(db, 'products');
            const snapshot = await getDocs(productsRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new Error('Failed to fetch products. Check your network and permissions.');
        }
    },

    async getProduct(productId: string): Promise<Product | null> {
        try {
            const productRef = doc(db, 'products', productId);
            const snapshot = await getDoc(productRef);

            if (!snapshot.exists()) {
                return null;
            }

            return {
                id: snapshot.id,
                ...snapshot.data()
            } as Product;
        } catch (error) {
            console.error('Error fetching product by ID:', error);
            throw new Error('Failed to fetch product.');
        }
    },

    async getProductsByCategory(category: string): Promise<Product[]> {
        try {
            const productsRef = collection(db, 'products');
            const q = query(productsRef, where('category', '==', category), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
        } catch (error) {
            console.error('Error fetching products by category:', error);
            throw new Error('Failed to fetch products by category.');
        }
    },

    async getProductsSortedByPrice(ascending: boolean = true): Promise<Product[]> {
        try {
            const productsRef = collection(db, 'products');
            const q = query(productsRef, orderBy('price', ascending ? 'asc' : 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
        } catch (error) {
            console.error('Error fetching sorted products:', error);
            throw new Error('Failed to fetch sorted products.');
        }
    },

    async getProductsInStock(): Promise<Product[]> {
        try {
            const productsRef = collection(db, 'products');
            const q = query(productsRef, where('inStock', '==', true), orderBy('price', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
        } catch (error) {
            console.error('Error fetching products in stock:', error);
            throw new Error('Failed to fetch products in stock.');
        }
    },

    async createProduct(productData: CreateProductInput): Promise<string> {
        const auth = getAuth();

        if (!auth.currentUser) {
            throw new Error('You must be authenticated to create a product.');
        }

        try {
            const productsRef = collection(db, 'products');
            const docRef = await addDoc(productsRef, {
                ...productData,
                userId: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating product:', error);
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                throw new Error('Permission denied. Make sure you are logged in and have write access.');
            }
            throw new Error('Failed to create product.');
        }
    },

    async deleteProduct(productId: string): Promise<void> {
        const auth = getAuth();

        if (!auth.currentUser) {
            throw new Error('You must be authenticated to delete a product.');
        }

        try {
            const productRef = doc(db, 'products', productId);
            await deleteDoc(productRef);
            console.log(`✅ Product ${productId} deleted successfully`);
        } catch (error) {
            console.error('Error deleting product:', error);
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                throw new Error('Permission denied. Make sure you are logged in and have delete access.');
            }
            throw new Error('Failed to delete product.');
        }
    },

    async updateProduct(productId: string, updates: UpdateProductInput): Promise<void> {
        const auth = getAuth();

        if (!auth.currentUser) {
            throw new Error('You must be authenticated to update a product.');
        }

        try {
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });
            console.log(`✅ Product ${productId} updated successfully`);
        } catch (error) {
            console.error('Error updating product:', error);
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                throw new Error('Permission denied. Make sure you are logged in and have update access.');
            }
            throw new Error('Failed to update product.');
        }
    },

    async deleteMultipleProducts(productIds: string[]): Promise<void> {
        const auth = getAuth();

        if (!auth.currentUser) {
            throw new Error('You must be authenticated to delete products.');
        }

        try {
            const deletePromises = productIds.map(async (productId) => {
                const productRef = doc(db, 'products', productId);
                await deleteDoc(productRef);
            });

            await Promise.all(deletePromises);
            console.log(`✅ ${productIds.length} products deleted successfully`);
        } catch (error) {
            console.error('Error deleting multiple products:', error);
            throw new Error('Failed to delete products.');
        }
    }
};

// ==================== USER SERVICE ====================

export const userService = {
    async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            return await firestoreService.createDocument('users', userData);
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Failed to create user.');
        }
    },

    async getUser(userId: string): Promise<User | null> {
        try {
            return await firestoreService.getDocument<User>('users', userId);
        } catch (error) {
            console.error('Error getting user:', error);
            throw new Error('Failed to get user.');
        }
    },

    async getAllUsers(): Promise<User[]> {
        try {
            return await firestoreService.getDocuments<User>('users');
        } catch (error) {
            console.error('Error getting all users:', error);
            throw new Error('Failed to get users.');
        }
    },

    async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        try {
            await firestoreService.updateDocument('users', userId, updates);
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error('Failed to update user.');
        }
    },

    async deleteUser(userId: string): Promise<void> {
        try {
            await firestoreService.deleteDocument('users', userId);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw new Error('Failed to delete user.');
        }
    },

    async getUsersByEmail(email: string): Promise<User[]> {
        try {
            const emailConstraint = where('email', '==', email);
            return await firestoreService.queryDocuments<User>('users', [emailConstraint]);
        } catch (error) {
            console.error('Error getting users by email:', error);
            throw new Error('Failed to get users by email.');
        }
    }
};