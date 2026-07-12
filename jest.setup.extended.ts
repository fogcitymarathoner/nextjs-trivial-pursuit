
// Add custom matchers
expect.extend({
    toBeValidFirestoreId(received: string) {
        const pass = /^[A-Za-z0-9_-]+$/.test(received);
        return {
            message: () =>
                `expected ${received} ${pass ? 'not ' : ''}to be a valid Firestore ID`,
            pass,
        };
    },
});

// Declare types for custom matchers
declare global {
    // Jest custom matcher types require namespace declaration merging.
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeValidFirestoreId(): R;
        }
    }
}
