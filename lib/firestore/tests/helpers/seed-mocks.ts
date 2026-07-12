// lib/firestore/tests/helpers/seed-mocks.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore seed helpers provide flexible SDK-shaped test doubles. */
export const createMockProduct = (overrides?: any) => ({
    name: `Test Product ${Date.now()}`,
    price: 29.99,
    category: 'electronics',
    inStock: true,
    description: 'Test product description',
    ...overrides,
});

export const createMockProducts = (count: number, overrides?: any) => {
    return Array.from({ length: count }, (_, i) =>
        createMockProduct({
            name: `Test Product ${i + 1}`,
            ...overrides,
        })
    );
};

export const createMockQuerySnapshot = (docs: any[] = []) => ({
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((doc, index) => ({
        id: doc.id || `doc-${index}`,
        data: () => doc,
        exists: () => true,
        ref: { id: doc.id || `doc-${index}` },
        metadata: {
            fromCache: false,
            hasPendingWrites: false,
        },
        get: jest.fn(),
        isEqual: jest.fn(),
    })) as any,
    forEach: jest.fn((callback) => docs.forEach(callback)),
    metadata: {
        fromCache: false,
        hasPendingWrites: false,
    },
    query: {} as any,
    docsChanged: jest.fn(),
});

export const createMockDocumentSnapshot = (
    id: string,
    data: any,
    exists = true
) => ({
    id,
    data: () => data,
    exists: () => exists,
    ref: { id },
    metadata: {
        fromCache: false,
        hasPendingWrites: false,
    },
    get: jest.fn(),
    isEqual: jest.fn(),
});

export const createMockBatch = (options?: {
    shouldFail?: boolean;
    failAfter?: number;
}) => {
    const operations: any[] = [];

    const mockBatch: {
        set: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        commit: jest.Mock;
        getOperations: () => any[];
    } = {
        set: jest.fn((ref, data) => {
            operations.push({ type: 'set', ref, data });
            return mockBatch;
        }),
        update: jest.fn((ref, data) => {
            operations.push({ type: 'update', ref, data });
            return mockBatch;
        }),
        delete: jest.fn((ref) => {
            operations.push({ type: 'delete', ref });
            return mockBatch;
        }),
        commit: jest.fn(async () => {
            if (options?.shouldFail) {
                throw new Error('Batch commit failed');
            }
            if (options?.failAfter && operations.length >= options.failAfter) {
                throw new Error('Batch commit failed after ' + options.failAfter + ' operations');
            }
            return Promise.resolve();
        }),
        getOperations: () => operations,
    };

    return mockBatch;
};

// Export commonly used mocks
export const mockSeedData = {
    products: createMockProducts(5),
    product: createMockProduct(),
};

// Mock Firestore Admin response
export const mockAdminFirestoreResponse = {
    collection: jest.fn(),
    batch: jest.fn(),
};

// Reset all mocks between tests
export const resetSeedMocks = () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
};

const seedTestHelpers = {
    createMockProduct,
    createMockProducts,
    createMockQuerySnapshot,
    createMockDocumentSnapshot,
    createMockBatch,
    mockSeedData,
    mockAdminFirestoreResponse,
    resetSeedMocks,
};

export default seedTestHelpers;
