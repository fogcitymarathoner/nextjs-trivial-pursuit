// lib/firebase/__tests__/admin-firestore.test.ts
//
// Mock environment config first
jest.mock('@/config/env.server', () => ({}));

// Mock firebase-admin modules
jest.mock('firebase-admin/app');
jest.mock('firebase-admin/firestore');

// Mock the admin module
jest.mock('../admin', () => ({
    isFirebaseInitialized: jest.fn(),
}));

// Import after mocks
import { getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { isFirebaseInitialized } from '../admin';
import { getFirebaseAdminFirestore } from '../admin-firestore';

// Type the mocks
const mockGetApps = getApps as jest.MockedFunction<typeof getApps>;
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;
const mockIsFirebaseInitialized = isFirebaseInitialized as jest.MockedFunction<typeof isFirebaseInitialized>;
const asAdminApp = (name: string): App => ({ name } as unknown as App);
const asAdminFirestore = (value: object): Firestore => value as Firestore;

describe('getFirebaseAdminFirestore', () => {
    // Store original environment
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('when Firebase is not initialized', () => {
        it('should return null', () => {
            mockIsFirebaseInitialized.mockReturnValue(false);

            const result = getFirebaseAdminFirestore();

            expect(result).toBeNull();
            expect(mockIsFirebaseInitialized).toHaveBeenCalled();
            expect(mockGetApps).not.toHaveBeenCalled();
            expect(mockGetFirestore).not.toHaveBeenCalled();
        });
    });

    describe('when Firebase is initialized', () => {
        const mockApp = asAdminApp('mock-app');
        const mockFirestore = asAdminFirestore({ collection: jest.fn() });

        beforeEach(() => {
            mockIsFirebaseInitialized.mockReturnValue(true);
            mockGetApps.mockReturnValue([mockApp]);
            mockGetFirestore.mockReturnValue(mockFirestore);
        });

        it('should return Firestore instance with default database ID', () => {
            delete process.env.FIRESTORE_DATABASE_ID;
            delete process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockIsFirebaseInitialized).toHaveBeenCalled();
            expect(mockGetApps).toHaveBeenCalled();
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp, '(default)');
        });

        it('should use FIRESTORE_DATABASE_ID from environment', () => {
            const databaseId = 'custom-database';
            process.env.FIRESTORE_DATABASE_ID = databaseId;

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp, databaseId);
        });

        it('should fallback to NEXT_PUBLIC_FIRESTORE_DATABASE_ID when FIRESTORE_DATABASE_ID is not set', () => {
            const databaseId = 'public-custom-database';
            delete process.env.FIRESTORE_DATABASE_ID;
            process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID = databaseId;

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp, databaseId);
        });

        it('should prioritize FIRESTORE_DATABASE_ID over NEXT_PUBLIC_FIRESTORE_DATABASE_ID', () => {
            const serverDatabaseId = 'server-database';
            const clientDatabaseId = 'client-database';

            process.env.FIRESTORE_DATABASE_ID = serverDatabaseId;
            process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID = clientDatabaseId;

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp, serverDatabaseId);
        });

        it('should use default "(default)" when no database IDs are configured', () => {
            delete process.env.FIRESTORE_DATABASE_ID;
            delete process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp, '(default)');
        });

        it('should handle environment variables with empty strings', () => {
            process.env.FIRESTORE_DATABASE_ID = '';
            delete process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp, '(default)');
        });

        it('should use the first app from getApps()', () => {
            const multipleApps = [
                asAdminApp('app1'),
                asAdminApp('app2'),
                asAdminApp('app3'),
            ];
            mockGetApps.mockReturnValue(multipleApps);

            const result = getFirebaseAdminFirestore();

            expect(result).toBe(mockFirestore);
            expect(mockGetFirestore).toHaveBeenCalledWith(multipleApps[0], '(default)');
        });
    });

    describe('edge cases', () => {
        it('should handle getApps returning empty array', () => {
            mockIsFirebaseInitialized.mockReturnValue(true);
            mockGetApps.mockReturnValue([]);

            expect(getFirebaseAdminFirestore()).toBeNull();
            expect(mockGetFirestore).not.toHaveBeenCalled();
        });

        it('should handle special characters in database ID', () => {
            const specialDbId = 'my-db_123';
            process.env.FIRESTORE_DATABASE_ID = specialDbId;

            mockIsFirebaseInitialized.mockReturnValue(true);
            mockGetApps.mockReturnValue([asAdminApp('mock-app')]);
            mockGetFirestore.mockReturnValue(asAdminFirestore({}));

            getFirebaseAdminFirestore();

            expect(mockGetFirestore).toHaveBeenCalledWith(expect.anything(), specialDbId);
        });
    });
});
