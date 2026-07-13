// lib/firestore/tests/helpers/mock-firestore-service.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- Firebase SDK test doubles intentionally model overloaded external types. */

/**
 * Creates a mock Firestore query snapshot
 */
export const createMockFirestoreResponse = (options?: {
    empty?: boolean;
    size?: number;
    docs?: unknown[];
    fromCache?: boolean;
    hasPendingWrites?: boolean;
}) => ({
    empty: options?.empty ?? false,
    size: options?.size ?? (options?.docs?.length ?? 1),
    docs: options?.docs?.map((doc, index) => ({
        id: `doc-${index}`,
        data: () => doc,
        exists: () => true,
        ref: {
            id: `doc-${index}`,
            path: `collection/doc-${index}`,
            firestore: {},
            type: 'document',
            parent: null,
            withConverter: jest.fn(),
        },
        metadata: {
            fromCache: options?.fromCache ?? false,
            hasPendingWrites: options?.hasPendingWrites ?? false,
        },
        get: jest.fn(),
        isEqual: jest.fn(),
    })) as any,
    forEach: jest.fn(),
    metadata: {
        fromCache: options?.fromCache ?? false,
        hasPendingWrites: options?.hasPendingWrites ?? false,
    },
    query: {} as any,
    docsChanged: jest.fn(),
});

/**
 * Creates a mock Firestore document snapshot
 */
export const createMockDocumentSnapshot = <T = any>(
    id: string,
    data: T,
    exists = true,
    options?: {
        fromCache?: boolean;
        hasPendingWrites?: boolean;
    }
) => ({
    id,
    data: () => data,
    exists: () => exists,
    ref: {
        id,
        path: `collection/${id}`,
        firestore: {},
        type: 'document',
        parent: null,
        withConverter: jest.fn(),
    },
    metadata: {
        fromCache: options?.fromCache ?? false,
        hasPendingWrites: options?.hasPendingWrites ?? false,
    },
    get: jest.fn((field: string) => (data as any)?.[field]),
    isEqual: jest.fn(),
});

/**
 * Creates mock Firestore document reference with ID
 */
export const createMockDocRef = (id: string) => ({
    id,
    path: `collection/${id}`,
    firestore: {},
    type: 'document',
    parent: null,
    withConverter: jest.fn(),
});

/**
 * Creates mock Firestore collection reference
 */
export const createMockCollectionRef = (collectionName: string) => ({
    id: collectionName,
    path: collectionName,
    firestore: {},
    type: 'collection',
    parent: null,
    withConverter: jest.fn(),
});

/**
 * Creates a mock Firestore Timestamp
 */
export const createMockTimestamp = (date: Date = new Date()) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: date.getMilliseconds() * 1000000,
    toDate: () => date,
    toMillis: () => date.getTime(),
    isEqual: jest.fn(),
});

/**
 * Creates mock error objects for different scenarios
 */
export const createMockError = (
    type: 'network' | 'auth' | 'timeout' | 'permission' | 'not-found' | 'already-exists' | 'general',
    customMessage?: string
) => {
    const errors = {
        network: new Error(customMessage || 'Network error: Failed to fetch'),
        auth: new Error(customMessage || 'Authentication failed: Invalid credentials'),
        timeout: new Error(customMessage || 'Timeout: Request timed out after 30s'),
        permission: new Error(customMessage || 'Permission denied: Missing or insufficient permissions'),
        'not-found': new Error(customMessage || 'Document not found'),
        'already-exists': new Error(customMessage || 'Document already exists'),
        general: new Error(customMessage || 'Generic Firebase error'),
    };

    const error = errors[type] || errors.general;
    // Add Firebase error codes
    (error as any).code = type === 'network' ? 'network-error' :
        type === 'auth' ? 'auth/invalid-credentials' :
            type === 'timeout' ? 'deadline-exceeded' :
                type === 'permission' ? 'permission-denied' :
                    type === 'not-found' ? 'not-found' :
                        type === 'already-exists' ? 'already-exists' :
                            'unknown';
    return error;
};

/**
 * Creates mock user data
 */
export const createMockUser = (overrides?: Partial<any>) => ({
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock product data
 */
export const createMockProduct = (overrides?: Partial<any>) => ({
    id: 'product-123',
    name: 'Test Product',
    price: 29.99,
    category: 'electronics',
    inStock: true,
    description: 'Test product description',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock user array
 */
export const createMockUsers = (count: number, overrides?: Partial<any>) => {
    return Array.from({ length: count }, (_, index) =>
        createMockUser({
            id: `user-${index + 1}`,
            name: `User ${index + 1}`,
            email: `user${index + 1}@example.com`,
            ...overrides,
        })
    );
};

/**
 * Creates mock product array
 */
export const createMockProducts = (count: number, overrides?: Partial<any>) => {
    return Array.from({ length: count }, (_, index) =>
        createMockProduct({
            id: `product-${index + 1}`,
            name: `Product ${index + 1}`,
            price: 10 + (index * 5),
            ...overrides,
        })
    );
};

/**
 * Creates a mock Firestore query with constraints
 */
export const createMockQuery = (collectionName: string, constraints: any[] = []) => ({
    type: 'query',
    firestore: {},
    collection: collectionName,
    constraints,
    withConverter: jest.fn(),
});

/**
 * Creates mock console with spies for testing
 */
export const mockConsole = () => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    const mockFunctions = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    };

    beforeEach(() => {
        console.log = mockFunctions.log;
        console.error = mockFunctions.error;
        console.warn = mockFunctions.warn;
        console.info = mockFunctions.info;
        console.debug = mockFunctions.debug;
    });

    afterEach(() => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        console.info = originalInfo;
        console.debug = originalDebug;
        jest.clearAllMocks();
    });

    return mockFunctions;
};

/**
 * Creates a mock Firestore service response with pagination
 */
export const createMockPaginatedResponse = <T = any>(
    items: T[],
    options?: {
        pageSize?: number;
        lastDocId?: string;
        hasMore?: boolean;
    }
) => ({
    items,
    lastDocId: options?.lastDocId || (items.length > 0 ? `doc-${items.length}` : null),
    hasMore: options?.hasMore ?? false,
    pageSize: options?.pageSize || items.length,
    total: items.length,
});

/**
 * Creates mock error response for service operations
 */
export const createMockErrorResponse = (error: Error) => ({
    success: false,
    error: {
        message: error.message,
        code: (error as any).code || 'unknown',
        stack: error.stack,
    },
    data: null,
});

/**
 * Creates mock success response for service operations
 */
export const createMockSuccessResponse = <T = any>(data: T) => ({
    success: true,
    error: null,
    data,
});

/**
 * Utility to reset all mocks between tests
 */
export const resetAllMocks = () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
};

/**
 * Creates a spy on console methods and returns them for assertions
 */
export const spyOnConsole = () => ({
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
    debug: jest.spyOn(console, 'debug').mockImplementation(),
});

/**
 * Restores console spies
 */
export const restoreConsoleSpies = (spies: ReturnType<typeof spyOnConsole>) => {
    Object.values(spies).forEach(spy => spy.mockRestore());
};

/**
 * Creates a mock Firebase App instance
 */
export const createMockFirebaseApp = (name: string = '[DEFAULT]') => ({
    name,
    options: {
        projectId: 'mock-project',
        apiKey: 'mock-api-key',
        authDomain: 'mock-auth.firebaseapp.com',
    },
    automaticDataCollectionEnabled: false,
});

/**
 * Creates mock Firestore instance
 */
export const createMockFirestore = () => ({
    type: 'firestore',
    app: createMockFirebaseApp(),
    toJSON: jest.fn(),
    settings: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    runTransaction: jest.fn(),
    batch: jest.fn(),
});

// Default export for convenient importing
const firestoreTestHelpers = {
    createMockFirestoreResponse,
    createMockDocumentSnapshot,
    createMockDocRef,
    createMockCollectionRef,
    createMockTimestamp,
    createMockError,
    createMockUser,
    createMockProduct,
    createMockUsers,
    createMockProducts,
    createMockQuery,
    mockConsole,
    createMockPaginatedResponse,
    createMockErrorResponse,
    createMockSuccessResponse,
    resetAllMocks,
    spyOnConsole,
    restoreConsoleSpies,
    createMockFirebaseApp,
    createMockFirestore,
};

export default firestoreTestHelpers;
