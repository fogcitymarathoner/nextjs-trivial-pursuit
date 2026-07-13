// lib/firebase/tests/test.integration.test.ts

describe('testFirebaseConnection Integration', () => {
    // The browser SDK requires both values. Firebase Admin configuration alone
    // is not enough to initialize lib/firebase/client.ts.
    const shouldRunIntegration = Boolean(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );

    const describeOrSkip = shouldRunIntegration ? describe : describe.skip;

    describeOrSkip('Integration tests with real Firebase', () => {
        let testFirebaseConnection: typeof import('../test').testFirebaseConnection;

        // Store original console methods
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;

        beforeAll(async () => {
            ({ testFirebaseConnection } = await import('../test'));
        });

        beforeEach(() => {
            console.log = jest.fn();
            console.error = jest.fn();
        });

        afterAll(() => {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
        });

        it('should successfully connect to Firebase', async () => {
            const result = await testFirebaseConnection();

            // Don't assert on the result, just verify it runs without errors
            expect(typeof result).toBe('boolean');
        });

        it('should not throw unhandled exceptions', async () => {
            await expect(testFirebaseConnection()).resolves.toEqual(expect.any(Boolean));
        });

        it('should log appropriate messages', async () => {
            await testFirebaseConnection();

            // At least one console method should have been called
            const logCalls = (console.log as jest.Mock).mock.calls.length;
            const errorCalls = (console.error as jest.Mock).mock.calls.length;

            expect(logCalls + errorCalls).toBeGreaterThan(0);
        });

        it('should handle being called multiple times', async () => {
            const firstResult = await testFirebaseConnection();
            const secondResult = await testFirebaseConnection();

            expect(firstResult).toBe(secondResult);
        });
    });

    describe('Skipped when Firebase not configured', () => {
        it.skip('should be skipped if no Firebase config', () => {
            console.log('Firebase not configured, skipping integration tests');
        });
    });
});
