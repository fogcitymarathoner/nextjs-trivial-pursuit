// jest.setup.js or jest.setup.ts
import '@testing-library/jest-dom';

// Mock console.error to reduce noise in tests
const originalConsoleError = console.error;
console.error = jest.fn((...args) => {
    // Filter out specific warnings if needed
    if (args[0]?.includes?.('Warning:')) {
        return;
    }
    originalConsoleError(...args);
});