// app/api/test-env/__tests__/route.test.ts

// Mock NextResponse - this will be the only mock we use
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

// Default env mocks
const defaultEnvMocks = {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mock-project-id',
    NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: 'mock@example.com',
    NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: 'mock-private-key',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'mock-api-key',
};

// Helper to get route with specific env mocks using require
const getRouteWithEnv = (envMocks: any) => {
    // Clear the require cache for the env.server module
    const modulePath = require.resolve('@/config/env.server');
    delete require.cache[modulePath];

    // Set up the mock
    jest.doMock('@/config/env.server', () => envMocks);

    // Clear and re-require the route
    const routePath = require.resolve('../route');
    delete require.cache[routePath];

    // Re-import with the new mocks
    const { GET } = require('../route');
    return GET;
};

describe('Test Env API Route - GET', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        // Reset modules
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
        // Clean up require cache
        jest.resetModules();
    });

    describe('Successful response', () => {
        it('should return environment variable status checks', async () => {
            const testKey = 'mock-signature-key-12345';
            process.env.COOKIE_SIGNATURE_KEY = testKey;
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '✅',
                COOKIE_SIGNATURE_KEY: `✅ (${testKey.length} chars)`,
                NODE_ENV: 'test',
            });
        });

        it('should show ❌ for missing Firebase environment variables', async () => {
            process.env.COOKIE_SIGNATURE_KEY = 'test-key';
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: undefined,
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: undefined,
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: undefined,
                NEXT_PUBLIC_FIREBASE_API_KEY: undefined,
            });

            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '❌',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '❌',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '❌',
                NEXT_PUBLIC_FIREBASE_API_KEY: '❌',
                COOKIE_SIGNATURE_KEY: '✅ (8 chars)',
                NODE_ENV: 'test',
            });
        });

        it('should show ❌ for missing COOKIE_SIGNATURE_KEY', async () => {
            delete process.env.COOKIE_SIGNATURE_KEY;
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '✅',
                COOKIE_SIGNATURE_KEY: '❌ MISSING',
                NODE_ENV: 'test',
            });
        });

        it('should show character count for COOKIE_SIGNATURE_KEY', async () => {
            const testKey = 'test-key-12345';
            process.env.COOKIE_SIGNATURE_KEY = testKey;
            process.env.NODE_ENV = 'development';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '✅',
                COOKIE_SIGNATURE_KEY: `✅ (${testKey.length} chars)`,
                NODE_ENV: 'development',
            });
        });

        it('should handle COOKIE_SIGNATURE_KEY with different lengths', async () => {
            const testKey = 'short';
            process.env.COOKIE_SIGNATURE_KEY = testKey;
            process.env.NODE_ENV = 'production';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '✅',
                COOKIE_SIGNATURE_KEY: `✅ (${testKey.length} chars)`,
                NODE_ENV: 'production',
            });
        });

        it('should handle COOKIE_SIGNATURE_KEY with special characters', async () => {
            const testKey = '!@#$%^&*()_+-=';
            process.env.COOKIE_SIGNATURE_KEY = testKey;
            process.env.NODE_ENV = 'staging';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '✅',
                COOKIE_SIGNATURE_KEY: `✅ (${testKey.length} chars)`,
                NODE_ENV: 'staging',
            });
        });
    });

    describe('Environment variable combinations', () => {
        it('should handle mixed presence of environment variables', async () => {
            process.env.COOKIE_SIGNATURE_KEY = 'mock-key';
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mock-project-id',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: undefined,
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: 'mock-private-key',
                NEXT_PUBLIC_FIREBASE_API_KEY: undefined,
            });

            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '❌',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '❌',
                COOKIE_SIGNATURE_KEY: '✅ (8 chars)',
                NODE_ENV: 'test',
            });
        });

        it('should handle empty string values as missing', async () => {
            process.env.COOKIE_SIGNATURE_KEY = '';
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '',
                NEXT_PUBLIC_FIREBASE_API_KEY: '',
            });

            const response = await GET();

            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '❌',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '❌',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '❌',
                NEXT_PUBLIC_FIREBASE_API_KEY: '❌',
                COOKIE_SIGNATURE_KEY: '❌ MISSING',
                NODE_ENV: 'test',
            });
        });
    });

    describe('Response structure', () => {
        it('should return JSON response with status 200', async () => {
            process.env.COOKIE_SIGNATURE_KEY = 'test-key';
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: '✅',
                NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: '✅',
                NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: '✅',
                NEXT_PUBLIC_FIREBASE_API_KEY: '✅',
                COOKIE_SIGNATURE_KEY: '✅ (8 chars)',
                NODE_ENV: 'test',
            });
        });

        it('should include all expected keys in response', async () => {
            process.env.COOKIE_SIGNATURE_KEY = 'test-key';
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            const expectedKeys = [
                'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
                'NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL',
                'NEXT_PUBLIC_FIREBASE_PRIVATE_KEY',
                'NEXT_PUBLIC_FIREBASE_API_KEY',
                'COOKIE_SIGNATURE_KEY',
                'NODE_ENV',
            ];

            expect(Object.keys(response.body)).toEqual(expectedKeys);
        });
    });

    describe('Edge cases', () => {
        it('should handle undefined COOKIE_SIGNATURE_KEY correctly', async () => {
            delete process.env.COOKIE_SIGNATURE_KEY;
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body.COOKIE_SIGNATURE_KEY).toBe('❌ MISSING');
        });

        it('should handle null COOKIE_SIGNATURE_KEY correctly', async () => {
            process.env.COOKIE_SIGNATURE_KEY = null as any;
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body.COOKIE_SIGNATURE_KEY).toBe('❌ MISSING');
        });

        it('should handle number values in COOKIE_SIGNATURE_KEY', async () => {
            process.env.COOKIE_SIGNATURE_KEY = '12345' as any;
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body.COOKIE_SIGNATURE_KEY).toBe('✅ (5 chars)');
        });

        it('should handle very long COOKIE_SIGNATURE_KEY', async () => {
            const longKey = 'a'.repeat(1000);
            process.env.COOKIE_SIGNATURE_KEY = longKey;
            process.env.NODE_ENV = 'test';

            const GET = getRouteWithEnv(defaultEnvMocks);
            const response = await GET();

            expect(response.body.COOKIE_SIGNATURE_KEY).toBe(`✅ (${longKey.length} chars)`);
        });
    });
});
