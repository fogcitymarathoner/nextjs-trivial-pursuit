export type TestFirebaseAdapter = {
    createProduct: () => Promise<void>;
    getProductCount: () => Promise<number>;
};

declare global {
    interface Window {
        __TEST_FIREBASE_ADAPTER__?: TestFirebaseAdapter;
    }
}
