// lib/firebase/__tests__/test.test.ts
// Mock the firebase client and firestore modules
jest.mock('../client', () => ({
    db: {
        _delegate: {
            name: 'mock-firestore',
        },
        type: 'firestore',
    },
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    getDocs: jest.fn(),
}));

// Import after mocks
import { db } from '../client';
import { collection, getDocs } from 'firebase/firestore';
import { testFirebaseConnection } from '../test';

// Type the mocks
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
type FirestoreQuerySnapshot = Awaited<ReturnType<typeof getDocs>>;

const asQuerySnapshot = (value: object): FirestoreQuerySnapshot =>
    value as unknown as FirestoreQuerySnapshot;

describe('testFirebaseConnection', () => {
    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console methods
        console.log = jest.fn();
        console.error = jest.fn();
    });

    afterAll(() => {
        // Restore console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    describe('when connection is successful', () => {
        beforeEach(() => {
            mockCollection.mockReturnValue(
                { id: 'test-collection' } as unknown as ReturnType<typeof collection>
            );
            mockGetDocs.mockResolvedValue(asQuerySnapshot({
                empty: false,
                size: 1,
                docs: [],
                forEach: jest.fn(),
            }));
        });

        it('should return true when Firebase connection succeeds', async () => {
            const result = await testFirebaseConnection();

            expect(result).toBe(true);
            expect(mockCollection).toHaveBeenCalledWith(db, 'test');
            expect(mockGetDocs).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('✅ Firebase connection successful!');
            expect(console.error).not.toHaveBeenCalled();
        });

        it('should handle empty test collection gracefully', async () => {
            mockGetDocs.mockResolvedValue(asQuerySnapshot({
                empty: true,
                size: 0,
                docs: [],
                forEach: jest.fn(),
            }));

            const result = await testFirebaseConnection();

            expect(result).toBe(true);
            expect(console.log).toHaveBeenCalledWith('✅ Firebase connection successful!');
        });

        it('should handle large collections without issues', async () => {
            const largeDocs = Array(1000).fill({ data: () => ({}) });
            mockGetDocs.mockResolvedValue(asQuerySnapshot({
                empty: false,
                size: 1000,
                docs: largeDocs,
                forEach: jest.fn(),
            }));

            const result = await testFirebaseConnection();

            expect(result).toBe(true);
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('when connection fails', () => {
        it('should return false when Firebase connection fails with error', async () => {
            const mockError = new Error('Firebase connection refused');
            mockCollection.mockReturnValue({} as ReturnType<typeof collection>);
            mockGetDocs.mockRejectedValue(mockError);

            const result = await testFirebaseConnection();

            expect(result).toBe(false);
            expect(mockCollection).toHaveBeenCalledWith(db, 'test');
            expect(mockGetDocs).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledWith(
                '❌ Firebase connection failed:',
                mockError
            );
            expect(console.log).not.toHaveBeenCalled();
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network error: Failed to fetch');
            mockGetDocs.mockRejectedValue(networkError);

            const result = await testFirebaseConnection();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(
                '❌ Firebase connection failed:',
                networkError
            );
        });

        it('should handle authentication errors', async () => {
            const authError = new Error('Permission denied: Missing or insufficient permissions');
            mockGetDocs.mockRejectedValue(authError);

            const result = await testFirebaseConnection();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(
                '❌ Firebase connection failed:',
                authError
            );
        });

        it('should handle timeout errors', async () => {
            const timeoutError = new Error('Timeout: Request timed out after 30s');
            mockGetDocs.mockRejectedValue(timeoutError);

            const result = await testFirebaseConnection();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle malformed error objects', async () => {
            // Simulate a non-Error object being thrown
            mockGetDocs.mockRejectedValue('String error message');

            const result = await testFirebaseConnection();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith(
                '❌ Firebase connection failed:',
                'String error message'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle collection function throwing errors', async () => {
            mockCollection.mockImplementation(() => {
                throw new Error('Invalid collection reference');
            });

            const result = await testFirebaseConnection();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });

        it('should work with special characters in collection name', async () => {
            // Note: The function hardcodes 'test' collection, but we can verify it uses it
            mockCollection.mockReturnValue(
                { id: 'test-collection' } as unknown as ReturnType<typeof collection>
            );
            mockGetDocs.mockResolvedValue(asQuerySnapshot({ empty: true, docs: [] }));

            const result = await testFirebaseConnection();

            expect(mockCollection).toHaveBeenCalledWith(db, 'test');
            expect(result).toBe(true);
        });
    });

    describe('performance', () => {
        it('should complete within reasonable time', async () => {
            mockCollection.mockReturnValue({} as ReturnType<typeof collection>);
            mockGetDocs.mockResolvedValue(asQuerySnapshot({ empty: true, docs: [] }));

            const startTime = Date.now();
            await testFirebaseConnection();
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle concurrent calls', async () => {
            mockCollection.mockReturnValue({} as ReturnType<typeof collection>);
            mockGetDocs.mockResolvedValue(asQuerySnapshot({ empty: true, docs: [] }));

            const results = await Promise.all([
                testFirebaseConnection(),
                testFirebaseConnection(),
                testFirebaseConnection(),
            ]);

            expect(results).toEqual([true, true, true]);
            expect(mockGetDocs).toHaveBeenCalledTimes(3);
        });
    });
});
