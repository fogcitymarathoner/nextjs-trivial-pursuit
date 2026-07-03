// app/api/test-init/__tests__/route.test.ts
import { NextResponse } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            body,
            status: init?.status || 200,
            statusText: init?.statusText || 'OK',
            headers: new Headers(),
        })),
    },
}));

// Create a mutable array that can be accessed from the mock
const mockApps: any[] = [];

// Mock firebase-admin - use a getter to return the current mockApps
jest.mock('firebase-admin', () => ({
    get apps() {
        return mockApps;
    },
    initializeApp: jest.fn(),
}));

// Import the route after mocks are set up
import { GET } from '../route';

describe('Test Init API Route - GET', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        mockApps.length = 0;
        // Restore original env
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        mockApps.length = 0;
    });

    describe('Firebase initialization status', () => {
        it('should return initialized: true when Firebase is initialized', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            // Simulate Firebase initialized
            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'test',
            });
        });

        it('should return initialized: false when Firebase is not initialized', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            // Ensure mockApps is empty (not initialized)
            mockApps.length = 0;

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: false,
                appsCount: 0,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'test',
            });
        });
    });

    describe('Environment variable checks', () => {
        it('should show ✅ for all environment variables when present', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'production';

            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'production',
            });
        });

        it('should show ❌ for missing environment variables', async () => {
            // Delete environment variables
            delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            delete process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
            delete process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
            process.env.NODE_ENV = 'development';

            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '❌',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '❌',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '❌',
                },
                nodeEnv: 'development',
            });
        });

        it('should show ❌ for empty string environment variables', async () => {
            // Set empty string environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = '';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = '';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = '';
            process.env.NODE_ENV = 'staging';

            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '❌',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '❌',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '❌',
                },
                nodeEnv: 'staging',
            });
        });

        it('should show mixed status for environment variables', async () => {
            // Set mixed environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            delete process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '❌',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'test',
            });
        });
    });

    describe('Apps count', () => {
        it('should return correct appsCount when multiple apps are initialized', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            // Simulate multiple apps initialized
            mockApps.push({ name: '[DEFAULT]' });
            mockApps.push({ name: 'secondary' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 2,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'test',
            });
        });

        it('should return appsCount: 0 when no apps are initialized', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            mockApps.length = 0;

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: false,
                appsCount: 0,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'test',
            });
        });
    });

    describe('Node environment', () => {
        it('should return correct NODE_ENV value', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'production';

            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'production',
            });
        });

        it('should handle undefined NODE_ENV', async () => {
            // Delete NODE_ENV to simulate undefined
            delete process.env.NODE_ENV;

            // Set other environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';

            mockApps.push({ name: '[DEFAULT]' });

            await GET();

            expect(NextResponse.json).toHaveBeenCalledWith({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: undefined,
            });
        });
    });

    describe('Response structure', () => {
        it('should return JSON response with status 200', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            mockApps.push({ name: '[DEFAULT]' });

            const response = await GET();

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                initialized: true,
                appsCount: 1,
                envCheck: {
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                },
                nodeEnv: 'test',
            });
        });

        it('should include all expected keys in response', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            mockApps.push({ name: '[DEFAULT]' });

            const response = await GET();

            const expectedKeys = [
                'initialized',
                'appsCount',
                'envCheck',
                'nodeEnv',
            ];

            expect(Object.keys(response.body)).toEqual(expectedKeys);
        });

        it('should have envCheck with all expected keys', async () => {
            // Set environment variables
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
            process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL = 'mock@example.com';
            process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY = 'mock-private-key';
            process.env.NODE_ENV = 'test';

            mockApps.push({ name: '[DEFAULT]' });

            const response = await GET();

            const expectedEnvKeys = [
                'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
                'NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL',
                'NEXT_PUBLIC_FIREBASE_PRIVATE_KEY',
            ];

            expect(Object.keys(response.body.envCheck)).toEqual(expectedEnvKeys);
        });
    });
});