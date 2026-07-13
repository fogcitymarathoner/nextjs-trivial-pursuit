// lib/firebase/__tests__/admin.test.ts
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

type FirebaseAdminTestGlobals = typeof globalThis & {
    __mockInitializeApp?: jest.Mock;
    __mockGetApps?: jest.Mock;
    __mockCert?: jest.Mock;
    __mockApplicationDefault?: jest.Mock;
    __mockGetAuth?: jest.Mock;
};

const getTestGlobals = () => globalThis as FirebaseAdminTestGlobals;

// Mock firebase-admin
jest.mock('firebase-admin/app', () => {
    const testGlobals = globalThis as FirebaseAdminTestGlobals;
    testGlobals.__mockInitializeApp ??= jest.fn();
    testGlobals.__mockGetApps ??= jest.fn().mockReturnValue([]);
    testGlobals.__mockCert ??= jest.fn();
    testGlobals.__mockApplicationDefault ??= jest.fn();

    return {
        initializeApp: testGlobals.__mockInitializeApp,
        getApps: testGlobals.__mockGetApps,
        cert: testGlobals.__mockCert,
        applicationDefault: testGlobals.__mockApplicationDefault,
    };
});

jest.mock('firebase-admin/auth', () => {
    const testGlobals = globalThis as FirebaseAdminTestGlobals;
    testGlobals.__mockGetAuth ??= jest.fn();

    return {
        getAuth: testGlobals.__mockGetAuth,
    };
});

describe('Firebase Admin', () => {
    const originalEnv = { ...process.env };
    const setNodeEnv = (value: string | undefined) => {
        const env = process.env as Record<string, string | undefined>;
        if (value === undefined) {
            delete env.NODE_ENV;
            return;
        }
        env.NODE_ENV = value;
    };

    // Helper to clear module cache and reset mocks
    const resetModule = () => {
        jest.resetModules();
        jest.resetAllMocks();
        // Reset the firebase-admin mocks
        (getApps as jest.Mock).mockReturnValue([]);
        (getAuth as jest.Mock).mockReturnValue({ verifySessionCookie: jest.fn() });
        (applicationDefault as jest.Mock).mockReturnValue({});
        // Reset environment
        process.env = { ...originalEnv };
        setNodeEnv('test');
        delete process.env.NEXT_PHASE;
    };

    // Helper to import the module with custom env mocks
    const importWithEnv = async (
        envMocks: Record<string, string | undefined>,
    ) => {
        jest.resetModules();
        // Set environment variables directly, but preserve any existing runtime
        // process.env values when the mock entry is intentionally blank.
        Object.keys(envMocks).forEach(key => {
            const value = envMocks[key];
            if (value === undefined || value === '') {
                return;
            }
            process.env[key] = value as string;
        });
        // Import the module fresh
        const importedModule = await import('../admin');
        importedModule.isFirebaseInitialized();
        return importedModule;
    };

    beforeEach(() => {
        resetModule();
    });

    afterEach(() => {
        resetModule();
    });

    describe('Service Account parsing', () => {
        it('should parse service account from JSON string', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
                private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
            expect(initializeApp).toHaveBeenCalled();
            expect(adminAuth).toBeDefined();
        });

        it('should not treat FIREBASE_PRIVATE_KEY as a service account file path', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: './service-account.json',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).not.toHaveBeenCalled();
            expect(initializeApp).not.toHaveBeenCalled();
            expect(consoleSpy).not.toHaveBeenCalled();
            expect(adminAuth).toBeDefined();
            consoleSpy.mockRestore();
        });

        it('should clean private key by replacing \\n with newlines', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
                private_key: '-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----',
            });

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
            expect(adminAuth).toBeDefined();
        });

        it('should clean private key by removing quotes', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
                private_key: '"-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----"',
            });

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
            expect(adminAuth).toBeDefined();
        });

        it('should handle error if service account is missing project_id', async () => {
            const mockJson = JSON.stringify({
                client_email: 'test@example.com',
                private_key: 'test-key',
            });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Clear FIREBASE_PRIVATE_KEY to force JSON parsing
            await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            // The error should be caught and logged
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle error if service account is missing client_email', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                private_key: 'test-key',
            });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle error if service account is missing private_key', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
            });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('Environment variable fallback', () => {
        it('should prefer application default credentials when configured', async () => {
            const mockCredential = { source: 'application-default' };
            (applicationDefault as jest.Mock).mockReturnValue(mockCredential);

            await importWithEnv({
                GOOGLE_APPLICATION_CREDENTIALS: './service-account.json',
                FIREBASE_PRIVATE_KEY: '',
                FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
            });

            expect(applicationDefault).toHaveBeenCalled();
            expect(cert).not.toHaveBeenCalled();
            expect(initializeApp).toHaveBeenCalledWith({
                credential: mockCredential,
            });
        });

        it('should use individual environment variables when FIREBASE_PRIVATE_KEY is not set', async () => {
            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'env-project-id',
                FIREBASE_CLIENT_EMAIL: 'env@example.com',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: 'env-private-key',
                NEXT_PUBLIC_FIREBASE_API_KEY: 'env-api-key',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'env-project-id',
                clientEmail: 'env@example.com',
                privateKey: 'env-private-key',
            });
            expect(adminAuth).toBeDefined();
        });

        it('should use process.env as fallback when config values are not set', async () => {
            // Set process.env values directly
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'process-project-id';
            process.env.FIREBASE_CLIENT_EMAIL = 'process@example.com';
            process.env.FIREBASE_PRIVATE_KEY = 'process-private-key';

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'process-project-id',
                clientEmail: 'process@example.com',
                privateKey: 'process-private-key',
            });
            expect(adminAuth).toBeDefined();
        });

        it('should handle error if no credentials are found', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).not.toHaveBeenCalled();
            expect(initializeApp).not.toHaveBeenCalled();
            expect(consoleSpy).not.toHaveBeenCalled();
            expect(adminAuth).toBeDefined();
            consoleSpy.mockRestore();
        });
    });

    describe('Initialization', () => {
        it('should initialize Firebase Admin only once', async () => {
            // Mock that apps are already initialized
            (getApps as jest.Mock).mockReturnValue([{ name: '[DEFAULT]' }]);

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: JSON.stringify({
                    project_id: 'test-project',
                    client_email: 'test@example.com',
                    private_key: 'test-key',
                }),
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(initializeApp).not.toHaveBeenCalled();
            expect(getAuth).toHaveBeenCalled();
            expect(adminAuth).toBeDefined();
        });

        it('should initialize Firebase Admin if no apps exist', async () => {
            // Mock no apps initialized
            (getApps as jest.Mock).mockReturnValue([]);

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: JSON.stringify({
                    project_id: 'test-project',
                    client_email: 'test@example.com',
                    private_key: 'test-key',
                }),
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(initializeApp).toHaveBeenCalled();
            expect(getAuth).toHaveBeenCalled();
            expect(adminAuth).toBeDefined();
        });

        it('should initialize Firebase Admin with correct credential', async () => {
            (getApps as jest.Mock).mockReturnValue([]);

            const mockCredential = { projectId: 'test-project' };
            (cert as jest.Mock).mockReturnValue(mockCredential);

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: JSON.stringify({
                    project_id: 'test-project',
                    client_email: 'test@example.com',
                    private_key: 'test-key',
                }),
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(initializeApp).toHaveBeenCalledWith({
                credential: mockCredential,
            });
            expect(adminAuth).toBeDefined();
        });
    });

    describe('Exports', () => {
        it('should export adminAuth instance', async () => {
            const mockAuth = { verifySessionCookie: jest.fn() };
            (getAuth as jest.Mock).mockReturnValue(mockAuth);

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: JSON.stringify({
                    project_id: 'test-project',
                    client_email: 'test@example.com',
                    private_key: 'test-key',
                }),
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(adminAuth).toBe(mockAuth);
        });
    });

    describe('Edge cases', () => {
        it('should handle private key with multiple escaped newlines', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
                private_key: '-----BEGIN PRIVATE KEY-----\\n\\ntest-key\\n\\n-----END PRIVATE KEY-----',
            });

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\n\ntest-key\n\n-----END PRIVATE KEY-----',
            });
            expect(adminAuth).toBeDefined();
        });

        it('should handle private key with quotes and escaped newlines', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
                private_key: '"-----BEGIN PRIVATE KEY-----\\ntest-key\\n-----END PRIVATE KEY-----"',
            });

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
            expect(adminAuth).toBeDefined();
        });

        it('should handle JSON with whitespace', async () => {
            const mockJson = `{
                "project_id": "test-project",
                "client_email": "test@example.com",
                "private_key": "test-key"
            }`;

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith(expect.objectContaining({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: 'test-key',
            }));
            expect(adminAuth).toBeDefined();
        });
    });

    describe('Build time handling', () => {
        it('should skip initialization during build time', async () => {
            process.env.NEXT_PHASE = 'phase-production-build';

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: JSON.stringify({
                    project_id: 'test-project',
                    client_email: 'test@example.com',
                    private_key: 'test-key',
                }),
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).not.toHaveBeenCalled();
            expect(initializeApp).not.toHaveBeenCalled();
            expect(adminAuth).toBeDefined();
        });
    });
});
