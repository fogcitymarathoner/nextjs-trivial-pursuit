import type { Product } from '../../lib/firestore/productTypes';

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export type ProductListTestAdapter = {
    authUserId: string | null;
    getAllProducts: () => Promise<Product[]>;
    createProduct: (data: ProductInput) => Promise<unknown>;
    updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
};

declare global {
    interface Window {
        __PRODUCT_LIST_TEST_ADAPTER__?: ProductListTestAdapter;
    }
}
