// lib/firebase/__tests__/client.test.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Mock firebase/app
jest.mock('firebase/app', () => {
    const mocks = ((globalThis as any).__firebaseClientTestMocks ??= {
        initializeApp: jest.fn(),
        getApps: jest.fn().mockReturnValue([]),
        getAuth: jest.fn(),
    });

    return {
        initializeApp: mocks.initializeApp,
        getApps: mocks.getApps,
    };
});

// Mock firebase/auth
jest.mock('firebase/auth', () => {
    const mocks = ((globalThis as any).__firebaseClientTestMocks ??= {
        initializeApp: jest.fn(),
        getApps: jest.fn().mockReturnValue([]),
        getAuth: jest.fn(),
    });

    return {
        getAuth: mocks.getAuth,
    };
});

// Mock console.log to prevent test output noise
jest.spyOn(console, 'log').mockImplementation();

describe('Firebase Client', () => {
    const originalEnv = process.env;
    const mockApp = { name: '[DEFAULT]' };
    const mockAuth = { currentUser: null };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        // Reset modules to get fresh imports
        jest.resetModules();
        // Ensure getApps returns an empty array
        (getApps as jest.Mock).mockReturnValue([]);
        // Reset initializeApp mock
        (initializeApp as jest.Mock).mockReset();
        // Set default return values
        (initializeApp as jest.Mock).mockReturnValue(mockApp);
        (getAuth as jest.Mock).mockReturnValue(mockAuth);
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    describe('Firebase initialization', () => {
        it('should initialize Firebase when no apps exist', async () => {
            // Mock no apps initialized
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mock-auth-domain';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'mock-storage-bucket';
            process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'mock-sender-id';
            process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'mock-app-id';

            const { app, getFirebaseAuth } = await import('../client');
            const auth = getFirebaseAuth();

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: 'mock-api-key',
                authDomain: 'mock-auth-domain',
                projectId: 'mock-project-id',
                storageBucket: 'mock-storage-bucket',
                messagingSenderId: 'mock-sender-id',
                appId: 'mock-app-id',
            });
            expect(getAuth).toHaveBeenCalledWith(mockApp);
            expect(app).toBe(mockApp);
            expect(auth).toBe(mockAuth);
        });

        it('should use existing app when apps are already initialized', async () => {
            // Mock existing app
            (getApps as jest.Mock).mockReturnValue([mockApp]);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';

            const { app, getFirebaseAuth } = await import('../client');
            const auth = getFirebaseAuth();

            expect(initializeApp).not.toHaveBeenCalled();
            expect(getAuth).toHaveBeenCalledWith(mockApp);
            expect(app).toBe(mockApp);
            expect(auth).toBe(mockAuth);
        });

        it('should handle multiple apps by using the first one', async () => {
            const mockApp2 = { name: 'secondary' };
            (getApps as jest.Mock).mockReturnValue([mockApp, mockApp2]);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';

            const { app, getFirebaseAuth } = await import('../client');
            const auth = getFirebaseAuth();

            expect(initializeApp).not.toHaveBeenCalled();
            expect(getAuth).toHaveBeenCalledWith(mockApp);
            expect(app).toBe(mockApp);
            expect(auth).toBe(mockAuth);
        });
    });

    describe('Environment variables', () => {
        it('should use environment variables for Firebase config', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project-id';
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-storage-bucket';
            process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'test-sender-id';
            process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

            await import('../client');

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: 'test-api-key',
                authDomain: 'test-auth-domain',
                projectId: 'test-project-id',
                storageBucket: 'test-storage-bucket',
                messagingSenderId: 'test-sender-id',
                appId: 'test-app-id',
            });
        });

        it('should handle missing environment variables', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            // Don't set any environment variables
            delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
            delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
            delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
            delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
            delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

            await import('../client');

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: undefined,
                authDomain: undefined,
                projectId: undefined,
                storageBucket: undefined,
                messagingSenderId: undefined,
                appId: undefined,
            });
        });

        it('should handle partial environment variables', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'partial-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'partial-project-id';
            // Other variables left undefined

            await import('../client');

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: 'partial-api-key',
                authDomain: undefined,
                projectId: 'partial-project-id',
                storageBucket: undefined,
                messagingSenderId: undefined,
                appId: undefined,
            });
        });
    });

    describe('Console logging', () => {
        it('should log Firebase config status with checkmarks for present values', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mock-auth-domain';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            await import('../client');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '🔧 Firebase Client Config:',
                expect.objectContaining({
                    apiKey: '✅',
                    authDomain: '✅',
                    projectId: '✅',
                })
            );
        });

        it('should log Firebase config status with X marks for missing values', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            // Don't set any environment variables
            delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
            delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
            delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            await import('../client');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '🔧 Firebase Client Config:',
                expect.objectContaining({
                    apiKey: '❌',
                    authDomain: '❌',
                    projectId: '❌',
                })
            );
        });

        it('should log mixed status for Firebase config values', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
            // authDomain and projectId left undefined

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            await import('../client');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '🔧 Firebase Client Config:',
                expect.objectContaining({
                    apiKey: '✅',
                    authDomain: '❌',
                    projectId: '❌',
                })
            );
        });
    });

    describe('Exports', () => {
        it('should export app and lazily create auth instances', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';

            const { app, getFirebaseAuth } = await import('../client');

            expect(app).toBeDefined();
            expect(app).toBe(mockApp);
            expect(getAuth).not.toHaveBeenCalled();

            const auth = getFirebaseAuth();

            expect(auth).toBeDefined();
            expect(auth).toBe(mockAuth);
            expect(getAuth).toHaveBeenCalledWith(mockApp);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string environment variables', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = '';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = '';

            await import('../client');

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: '',
                authDomain: undefined,
                projectId: '',
                storageBucket: undefined,
                messagingSenderId: undefined,
                appId: undefined,
            });
        });

        it('should handle whitespace in environment variables', async () => {
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = '  mock-api-key  ';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = '  mock-project-id  ';

            await import('../client');

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: '  mock-api-key  ',
                authDomain: undefined,
                projectId: '  mock-project-id  ',
                storageBucket: undefined,
                messagingSenderId: undefined,
                appId: undefined,
            });
        });

        it('should handle special characters in environment variables', async () => {
            // Reset modules and clear mocks for this specific test
            jest.resetModules();
            (getApps as jest.Mock).mockReturnValue([]);
            (initializeApp as jest.Mock).mockReturnValue(mockApp);
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'api-key-with-special!@#$%';
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'auth-domain-test';
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'project-id-123';

            // Re-import the client module
            await import('../client');

            expect(initializeApp).toHaveBeenCalledWith({
                apiKey: 'api-key-with-special!@#$%',
                authDomain: 'auth-domain-test',
                projectId: 'project-id-123',
                storageBucket: undefined,
                messagingSenderId: undefined,
                appId: undefined,
            });
        });
    });
});
