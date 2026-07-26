export type FirebaseTestOutcome = {
    delay?: number;
    message?: string;
    type: 'resolve' | 'reject';
};

declare global {
    interface Window {
        __PRODUCTS_FIREBASE_TEST_OUTCOMES__?: FirebaseTestOutcome[];
    }
}
