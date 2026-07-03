// lib/firebase/__tests__/admin.test.ts
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Mock fs
jest.mock('fs', () => {
    const mocks = ((globalThis as any).__firebaseAdminTestMocks ??= {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        resolve: jest.fn((...args) => args.join('/')),
        initializeApp: jest.fn(),
        getApps: jest.fn().mockReturnValue([]),
        cert: jest.fn(),
        getAuth: jest.fn(),
    });

    return {
        existsSync: mocks.existsSync,
        readFileSync: mocks.readFileSync,
    };
});

// Mock path
jest.mock('path', () => {
    const mocks = ((globalThis as any).__firebaseAdminTestMocks ??= {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        resolve: jest.fn((...args) => args.join('/')),
        initializeApp: jest.fn(),
        getApps: jest.fn().mockReturnValue([]),
        cert: jest.fn(),
        getAuth: jest.fn(),
    });

    return {
        resolve: mocks.resolve,
    };
});

// Mock firebase-admin
jest.mock('firebase-admin/app', () => {
    const mocks = ((globalThis as any).__firebaseAdminTestMocks ??= {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        resolve: jest.fn((...args) => args.join('/')),
        initializeApp: jest.fn(),
        getApps: jest.fn().mockReturnValue([]),
        cert: jest.fn(),
        getAuth: jest.fn(),
    });

    return {
        initializeApp: mocks.initializeApp,
        getApps: mocks.getApps,
        cert: mocks.cert,
    };
});

jest.mock('firebase-admin/auth', () => {
    const mocks = ((globalThis as any).__firebaseAdminTestMocks ??= {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        resolve: jest.fn((...args) => args.join('/')),
        initializeApp: jest.fn(),
        getApps: jest.fn().mockReturnValue([]),
        cert: jest.fn(),
        getAuth: jest.fn(),
    });

    return {
        getAuth: mocks.getAuth,
    };
});

// Mock env.server with default values
jest.mock('@/config/env.server', () => ({
    FIREBASE_PRIVATE_KEY: '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mock-project-id',
    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: 'mock@example.com',
    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: 'mock-private-key',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'mock-api-key',
}));

describe('Firebase Admin', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        // Reset modules to get fresh imports
        jest.resetModules();
        // Ensure getApps returns an array
        (getApps as jest.Mock).mockReturnValue([]);
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    // Helper to import the module with custom env mocks
    const importWithEnv = async (envMocks: any) => {
        jest.resetModules();
        jest.doMock('@/config/env.server', () => envMocks);
        const module = await import('../admin');
        return module;
    };

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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
            expect(initializeApp).toHaveBeenCalled();
        });

        it('should parse service account from JSON file path', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
                private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });

            (existsSync as jest.Mock).mockReturnValue(true);
            (readFileSync as jest.Mock).mockReturnValue(mockJson);
            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: './service-account.json',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(existsSync).toHaveBeenCalled();
            expect(readFileSync).toHaveBeenCalled();
            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
        });

        it('should throw error if service account is missing project_id', async () => {
            const mockJson = JSON.stringify({
                client_email: 'test@example.com',
                private_key: 'test-key',
            });

            await expect(importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            })).rejects.toThrow('Firebase service account is missing project_id, client_email, or private_key');
        });

        it('should throw error if service account is missing client_email', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                private_key: 'test-key',
            });

            await expect(importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            })).rejects.toThrow('Firebase service account is missing project_id, client_email, or private_key');
        });

        it('should throw error if service account is missing private_key', async () => {
            const mockJson = JSON.stringify({
                project_id: 'test-project',
                client_email: 'test@example.com',
            });

            await expect(importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            })).rejects.toThrow('Firebase service account is missing project_id, client_email, or private_key');
        });
    });

    describe('Environment variable fallback', () => {
        it('should use individual environment variables when FIREBASE_PRIVATE_KEY is not set', async () => {
            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'env-project-id',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: 'env@example.com',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: 'env-private-key',
                NEXT_PUBLIC_FIREBASE_API_KEY: 'env-api-key',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'env-project-id',
                clientEmail: 'env@example.com',
                privateKey: 'env-private-key',
            });
        });

        it('should use process.env as fallback when config values are not set', async () => {
            process.env.FIREBASE_PROJECT_ID = 'process-project-id';
            process.env.FIREBASE_CLIENT_EMAIL = 'process@example.com';
            process.env.FIREBASE_PRIVATE_KEY_VALUE = 'process-private-key';

            (cert as jest.Mock).mockReturnValue({});

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'process-project-id',
                clientEmail: 'process@example.com',
                privateKey: 'process-private-key',
            });
        });

        it('should throw error if no credentials are found', async () => {
            // Clear any process.env fallbacks
            delete process.env.FIREBASE_PROJECT_ID;
            delete process.env.FIREBASE_CLIENT_EMAIL;
            delete process.env.FIREBASE_PRIVATE_KEY_VALUE;

            await expect(importWithEnv({
                FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            })).rejects.toThrow('Missing Firebase Admin credentials');
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(initializeApp).not.toHaveBeenCalled();
            expect(getAuth).toHaveBeenCalled();
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(initializeApp).toHaveBeenCalled();
            expect(getAuth).toHaveBeenCalled();
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(initializeApp).toHaveBeenCalledWith({
                credential: mockCredential,
            });
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\n\ntest-key\n\n-----END PRIVATE KEY-----',
            });
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
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            expect(cert).toHaveBeenCalledWith({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
            });
        });

        it('should handle JSON with whitespace', async () => {
            const mockJson = `{
                "project_id": "test-project",
                "client_email": "test@example.com",
                "private_key": "test-key"
            }`;

            (cert as jest.Mock).mockReturnValue({});
            (existsSync as jest.Mock).mockReturnValue(false);

            const { adminAuth } = await importWithEnv({
                FIREBASE_PRIVATE_KEY: mockJson,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            // The cert should be called with the parsed service account
            expect(cert).toHaveBeenCalledWith(expect.objectContaining({
                projectId: 'test-project',
                clientEmail: 'test@example.com',
                privateKey: 'test-key',
            }));
        });
    });
});
