// lib/firestore/firestore-service.ts

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    DocumentData,
    QueryConstraint,
    Timestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { User, Product } from './types';

// Generic CRUD operations
export const firestoreService = {
    // Create
    async createDocument<T>(collectionName: string, data: T): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, collectionName), {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    },

    // Create with custom ID
    async createDocumentWithId<T>(
        collectionName: string,
        id: string,
        data: T
    ): Promise<void> {
        try {
            await setDoc(doc(db, collectionName, id), {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error creating document with ID:', error);
            throw error;
        }
    },

    // Read all documents
    async getDocuments<T>(collectionName: string): Promise<T[]> {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as T[];
        } catch (error) {
            console.error('Error getting documents:', error);
            throw error;
        }
    },

    // Read single document
    async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
        try {
            const docRef = doc(db, collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as T;
            }
            return null;
        } catch (error) {
            console.error('Error getting document:', error);
            throw error;
        }
    },

    // Update document
    async updateDocument<T>(
        collectionName: string,
        id: string,
        data: Partial<T>
    ): Promise<void> {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    },

    // Delete document
    async deleteDocument(collectionName: string, id: string): Promise<void> {
        try {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    },

    // Query documents with filters
    async queryDocuments<T>(
        collectionName: string,
        constraints: QueryConstraint[]
    ): Promise<T[]> {
        try {
            const q = query(collection(db, collectionName), ...constraints);
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as T[];
        } catch (error) {
            console.error('Error querying documents:', error);
            throw error;
        }
    },
};

// Specific collection operations
export const userService = {
    createUser: (userData: Omit<User, 'createdAt' | 'updatedAt'>) =>
        firestoreService.createDocument<User>('users', userData as User),

    getUser: (id: string) =>
        firestoreService.getDocument<User>('users', id),

    getAllUsers: () =>
        firestoreService.getDocuments<User>('users'),

    updateUser: (id: string, data: Partial<User>) =>
        firestoreService.updateDocument<User>('users', id, data),

    deleteUser: (id: string) =>
        firestoreService.deleteDocument('users', id),

    getUsersByEmail: (email: string) =>
        firestoreService.queryDocuments<User>('users', [
            where('email', '==', email),
        ]),
};

export const productService = {
    createProduct: (productData: Omit<Product, 'createdAt' | 'updatedAt'>) =>
        firestoreService.createDocument<Product>('products', productData as Product),

    getProduct: (id: string) =>
        firestoreService.getDocument<Product>('products', id),

    getAllProducts: () =>
        firestoreService.getDocuments<Product>('products'),

    updateProduct: (id: string, data: Partial<Product>) =>
        firestoreService.updateDocument<Product>('products', id, data),

    deleteProduct: (id: string) =>
        firestoreService.deleteDocument('products', id),

    getProductsByCategory: (category: string) =>
        firestoreService.queryDocuments<Product>('products', [
            where('category', '==', category),
            orderBy('name'),
        ]),

    getProductsInStock: () =>
        firestoreService.queryDocuments<Product>('products', [
            where('inStock', '==', true),
            orderBy('price'),
        ]),
};
