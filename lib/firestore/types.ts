// Define your collection types
// lib/firestore/types.ts
export interface User {
    id?: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Product {
    id?: string;
    name: string;
    price: number;
    description: string;
    category: string;
    inStock: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Add more interfaces as needed for your collections