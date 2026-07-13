const isFocusedTestRun = process.argv.some((arg) =>
    /(__tests__|\.test\.|\.spec\.)/.test(arg)
);

// Check if running in CI environment
const isCI = process.env.CI === 'true';

// Check if we should run integration tests
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

// Check if running in watch mode
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('--watchAll');

// Determine test match patterns based on integration flag
const getTestMatch = () => {
    const patterns = [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.tsx',
        '**/*.test.ts',
        '**/*.test.tsx',
    ];

    if (!runIntegrationTests) {
        // Exclude integration tests by default
        patterns.push('!**/*.integration.test.ts');
        patterns.push('!**/*.integration.test.tsx');
        patterns.push('!**/integration/**/*.test.ts');
        patterns.push('!**/integration/**/*.test.tsx');
        patterns.push('!**/__tests__/integration/**');
    }

    return patterns;
};

// Get test path ignore patterns
const getTestPathIgnorePatterns = () => {
    const patterns = [
        '/node_modules/',
        '/.next/',
        '/out/',
        '/dist/',
        '/tmp/',
        '<rootDir>/.next/',
        '<rootDir>/out/',
        '<rootDir>/dist/',
        '<rootDir>/tmp/',
        '<rootDir>/coverage/',
        '<rootDir>/.jest-cache/',
        '<rootDir>/lib/firestore/tests/helpers/',
        '<rootDir>/lib/firebase/tests/helpers/',
        '<rootDir>/__tests__/helpers/',
        '<rootDir>/test-helpers/',
        '<rootDir>/__mocks__/',
        '<rootDir>/mocks/',
    ];

    if (!runIntegrationTests) {
        patterns.push('\\.integration\\.test\\.[jt]sx?$');
        patterns.push('<rootDir>/__tests__/integration/');
        patterns.push('<rootDir>/lib/.*/__tests__/integration/');
        patterns.push('<rootDir>/lib/.*/integration/');
    }

    return patterns;
};

// Get transform ignore patterns
const getTransformIgnorePatterns = () => {
    const patterns = [
        '/node_modules/(?!(jose|firebase-admin|jwks-rsa|@firebase|firebase|@grpc)/)',
        '/.next/',
    ];
    return patterns;
};

// Get watch plugins
const getWatchPlugins = () => {
    const plugins = [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname',
    ];

    if (!isCI) {
        plugins.push('jest-watch-select-projects');
    }

    return plugins;
};

// Get reporters
const getReporters = () => {
    if (isCI) {
        return [
            'default',
            ['jest-junit', {
                outputDirectory: 'test-results',
                outputName: 'junit.xml',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestrySeparator: ' › ',
                usePathForSuiteName: true,
            }],
            ['jest-sonar', {
                outputDirectory: 'test-results',
                outputName: 'sonar-report.xml',
            }],
        ];
    }
    return ['default'];
};

// Retained for optional local/CI configuration extensions.
void getWatchPlugins;
void getReporters;

// Get coverage threshold
const getCoverageThreshold = () => {
    if (isFocusedTestRun || isWatchMode) {
        return undefined;
    }

    return {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        // Specific thresholds for critical files
        "./lib/firestore/firestore-service.ts": {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90,
        },
        "./lib/firebase/admin.ts": {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90,
        },
        "./lib/firebase/client.ts": {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    };
};

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',

    // Test file patterns
    testMatch: getTestMatch(),
    testPathIgnorePatterns: getTestPathIgnorePatterns(),

    // Transform configurations
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            jsx: 'react-jsx',
            diagnostics: {
                ignoreCodes: ['TS151001'],
            },
        }],
        '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },

    // Module mappings
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',

        // Mock CSS/SCSS imports
        '^.+\\.(css|scss|sass|less|styl)$': '<rootDir>/__mocks__/styleMock.js',

        // Mock static assets
        '^.+\\.(jpg|jpeg|png|gif|webp|svg|ico|eot|otf|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',

        // Mock audio/video files
        '^.+\\.(mp3|mp4|wav|ogg)$': '<rootDir>/__mocks__/fileMock.js',
    },

    // Ignore patterns
    transformIgnorePatterns: getTransformIgnorePatterns(),

    modulePathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/out/',
        '<rootDir>/dist/',
        '<rootDir>/coverage/',
        '<rootDir>/.jest-cache/',
    ],

    // Watch patterns
    watchPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/coverage/',
        '<rootDir>/.jest-cache/',
        '<rootDir>/node_modules/',
        '<rootDir>/out/',
        '<rootDir>/dist/',
    ],

    // Coverage configuration
    collectCoverage: !isFocusedTestRun && !isWatchMode,
    collectCoverageFrom: [
        // Source files to collect coverage from
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'store/**/*.{ts,tsx}',
        'pages/**/*.{ts,tsx}',

        // Exclude test files
        '!**/__tests__/**',
        '!**/tests/**',
        '!**/*.test.ts',
        '!**/*.test.tsx',
        '!**/*.spec.ts',
        '!**/*.spec.tsx',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/tmp/**',

        // Exclude helper files
        '!**/__tests__/helpers/**',
        '!**/tests/helpers/**',
        '!lib/firestore/tests/helpers/**',
        '!lib/firebase/tests/helpers/**',
        '!**/test-utils/**',
        '!**/test-helpers/**',

        // Exclude integration tests from coverage
        '!**/*.integration.test.ts',
        '!**/*.integration.test.tsx',

        // Exclude mock files
        '!**/__mocks__/**',
        '!**/mocks/**',

        // Exclude generated files
        '!**/.next/**',
        '!**/out/**',
        '!**/dist/**',
        '!**/coverage/**',

        // Exclude configuration files
        '!**/*.config.js',
        '!**/*.config.ts',
        '!**/jest.setup.*',
        '!**/jest.config.*',

        // Exclude types
        '!**/types/**',
        '!**/types.ts',
        '!**/*Types.ts',
        '!**/*.types.ts',
        '!**/*.interface.ts',
    ],

    coverageReporters: [
        "text",
        "text-summary",
        "lcov",
        "html",
        "json",
        "json-summary",
        "clover",
    ],

    coverageDirectory: "<rootDir>/coverage",
    coverageProvider: "v8",

    // Coverage thresholds
    coverageThreshold: getCoverageThreshold(),

    setupFilesAfterEnv: [
        '<rootDir>/jest.setup.ts',
        '<rootDir>/jest.setup.extended.ts',
    ],

    // Global test settings
    testTimeout: isCI ? 30000 : 10000,
    verbose: isCI ? false : true,
    bail: isCI ? 1 : 0,

    // Cache configuration
    cacheDirectory: '<rootDir>/.jest-cache',

    // Global variables
    globals: {
        __DEV__: process.env.NODE_ENV !== 'production',
        __TEST__: true,
    },

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],

    // Reset mocks between tests
    resetMocks: false,
    restoreMocks: false,
    clearMocks: false,

    // Error handling
    errorOnDeprecated: true,

    reporters: ['default'],

    // Max workers for CI
    maxWorkers: isCI ? '50%' : '75%',

    // Force exit after tests
    forceExit: true,
    detectOpenHandles: true,

    // Additional options
    testLocationInResults: true,
    passWithNoTests: false,
    notify: false,

    // Snapshot configuration
    snapshotFormat: {
        printBasicPrototype: false,
    },

    // Projects for monorepo support (if needed)
    // projects: ['<rootDir>/packages/*'],

    // Test environment options
    testEnvironmentOptions: {
        url: 'http://localhost:3000',
    },

    // Fake timers configuration
    fakeTimers: {
        enableGlobally: false,
        advanceTimers: true,
        timerLimit: 5000,
        doNotFake: ['nextTick', 'setImmediate'],
    },
};

// Log configuration in verbose mode
if (process.env.DEBUG_JEST === 'true') {
    console.log('=======================================');
    console.log('🔧 Jest Configuration Details:');
    console.log('=======================================');
    console.log('📁 Test Match:', module.exports.testMatch);
    console.log('🚫 Test Path Ignore:', module.exports.testPathIgnorePatterns);
    console.log('📊 Collect Coverage:', module.exports.collectCoverage);
    console.log('🔄 Run Integration Tests:', runIntegrationTests);
    console.log('💻 CI Mode:', isCI);
    console.log('🎯 Focused Test Run:', isFocusedTestRun);
    console.log('👀 Watch Mode:', isWatchMode);
    console.log('⏱️ Test Timeout:', module.exports.testTimeout);
    console.log('⚙️ Max Workers:', module.exports.maxWorkers);
    console.log('📦 Setup Files:', module.exports.setupFilesAfterEnv);
    console.log('📊 Coverage Threshold:', module.exports.coverageThreshold ? 'Enabled' : 'Disabled');
    console.log('=======================================');
}
