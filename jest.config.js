const isFocusedTestRun = process.argv.some((arg) =>
    /(__tests__|\.test\.|\.spec\.)/.test(arg)
);

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testMatch: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.test.js',
        '**/*.test.jsx'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            jsx: 'react-jsx',
        }],
        '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        // Removed: 'next/server': '<rootDir>/__mocks__/next/server.ts',
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
        '/out/',
        '/dist/',
        '/tmp/'
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/out/'
    ],
    transformIgnorePatterns: [
        '/node_modules/',
        '/.next/'
    ],
    watchPathIgnorePatterns: [
        '<rootDir>/.next/'
    ],
    cacheDirectory: '<rootDir>/.jest-cache',
    testTimeout: 10000,

    collectCoverage: !isFocusedTestRun,
    collectCoverageFrom: [
        "app/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "!app/**/__tests__/**",
        "!lib/**/__tests__/**",
        "!components/**/__tests__/**",
        "!**/*.test.ts",
        "!**/*.test.tsx",
        "!**/*.test.js",
        "!**/*.test.jsx",
        "!**/*.spec.ts",
        "!**/*.spec.tsx",
        "!**/*.d.ts",
        "!**/node_modules/**",
        "!**/tmp/**"
    ],
    coverageReporters: ["text", "text-summary", "lcov", "html"],
    coverageDirectory: "<rootDir>/coverage",
    coverageProvider: "v8",
    coverageThreshold: isFocusedTestRun ? undefined : {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },
};
