// jest.setup.ts

import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

// Polyfill TextEncoder/TextDecoder for Node.js environment
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;

// ==================== CONSOLE MOCKING ====================

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

// Configure which console methods to mock
const MOCK_CONSOLE = {
    error: true,
    warn: false, // Set to true to mock warnings too
    log: false,
    info: false,
    debug: false,
};

// Mock console.error
if (MOCK_CONSOLE.error) {
    console.error = jest.fn((...args) => {
        // Filter out specific React warnings
        if (args[0]?.includes?.('Warning:')) {
            return;
        }
        // Filter out specific Firebase warnings
        if (args[0]?.includes?.('Firebase') && args[0]?.includes?.('warning')) {
            return;
        }
        // Filter out specific deprecation warnings
        if (args[0]?.includes?.('deprecated')) {
            return;
        }
        // Filter out specific test noise
        if (args[0]?.includes?.('ReactDOM.render is no longer supported')) {
            return;
        }
        originalConsoleError(...args);
    });
}

// Mock console.warn (if enabled)
if (MOCK_CONSOLE.warn) {
    console.warn = jest.fn((...args) => {
        // Filter out specific warnings
        if (args[0]?.includes?.('Warning:')) {
            return;
        }
        if (args[0]?.includes?.('deprecated')) {
            return;
        }
        originalConsoleWarn(...args);
    });
}

// Mock console.log (if enabled)
if (MOCK_CONSOLE.log) {
    console.log = jest.fn();
}

// Mock console.info (if enabled)
if (MOCK_CONSOLE.info) {
    console.info = jest.fn();
}

// Mock console.debug (if enabled)
if (MOCK_CONSOLE.debug) {
    console.debug = jest.fn();
}

// ==================== BROWSER API MOCKS ====================

// Mock matchMedia for components that use it
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(), // Deprecated
            removeListener: jest.fn(), // Deprecated
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}

// Mock IntersectionObserver
globalThis.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly scrollMargin = '';
    readonly thresholds: readonly number[] = [];

    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve() {}
};

// Mock ResizeObserver
globalThis.ResizeObserver = class MockResizeObserver implements ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
};

// Mock MutationObserver
globalThis.MutationObserver = class MockMutationObserver implements MutationObserver {
    disconnect() {}
    observe() {}
    takeRecords(): MutationRecord[] { return []; }
};

// Mock PerformanceObserver
globalThis.PerformanceObserver = class MockPerformanceObserver implements PerformanceObserver {
    static readonly supportedEntryTypes: readonly string[] = [];

    disconnect() {}
    observe() {}
    takeRecords(): PerformanceEntryList { return []; }
};

// ==================== DOM API MOCKS ====================

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() { return Object.keys(store).length; },
        key: jest.fn((index: number) => Object.keys(store)[index] || null),
    };
})();
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
}

// Mock sessionStorage
const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() { return Object.keys(store).length; },
        key: jest.fn((index: number) => Object.keys(store)[index] || null),
    };
})();
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
}

// Mock navigator properties
if (typeof window !== 'undefined') {
    Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
    });

    Object.defineProperty(window.navigator, 'language', {
        value: 'en-US',
        configurable: true,
    });

    Object.defineProperty(window.navigator, 'cookieEnabled', {
        value: true,
        configurable: true,
    });
}

if (typeof document !== 'undefined') {
    Object.defineProperty(document, 'cookie', {
        value: '',
        writable: true,
    });
}

// ==================== FETCH MOCK ====================

// Optional: Mock fetch globally if needed
// global.fetch = jest.fn() as any;

// ==================== RANDOM UTILITY FUNCTIONS ====================

/**
 * Utility to restore all mocks after tests
 */
export const restoreAllMocks = () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetAllMocks();
};

/**
 * Utility to clear all mock data
 */
export const clearAllMocks = () => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
};

/**
 * Utility to reset all mock implementations
 */
export const resetAllMocks = () => {
    jest.resetAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
};

// ==================== AFTER ALL TESTS ====================

// Cleanup after all tests
afterAll(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;

    // Clear all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();

    // Clean up DOM
    if (typeof document !== 'undefined') {
        document.body.innerHTML = '';
    }
});

// ==================== BEFORE EACH TEST ====================

beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
    if (typeof document !== 'undefined') {
        document.body.innerHTML = '';
    }
});

// ==================== EXPOSE UTILITIES ====================

// Expose utilities globally for tests
declare global {
    var __testUtils: {
        restoreAllMocks: typeof restoreAllMocks;
        clearAllMocks: typeof clearAllMocks;
        resetAllMocks: typeof resetAllMocks;
        localStorage: typeof localStorageMock;
        sessionStorage: typeof sessionStorageMock;
    };
}

global.__testUtils = {
    restoreAllMocks,
    clearAllMocks,
    resetAllMocks,
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
};
