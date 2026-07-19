import { FirebaseError } from 'firebase/app';
import type {
    DocumentData,
    DocumentSnapshot,
    QueryConstraint,
    QuerySnapshot,
} from 'firebase/firestore';

jest.mock('@/lib/firebase/client', () => ({
    db: { type: 'mock-firestore' },
}));

jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    addDoc: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    serverTimestamp: jest.fn(),
}));

import { getAuth } from 'firebase/auth';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { firestoreService, productService, userService } from '../productService';
import type { User } from '../productTypes';

const mocks = {
    getAuth: jest.mocked(getAuth),
    addDoc: jest.mocked(addDoc),
    collection: jest.mocked(collection),
    deleteDoc: jest.mocked(deleteDoc),
    doc: jest.mocked(doc),
    getDoc: jest.mocked(getDoc),
    getDocs: jest.mocked(getDocs),
    orderBy: jest.mocked(orderBy),
    query: jest.mocked(query),
    serverTimestamp: jest.mocked(serverTimestamp),
    setDoc: jest.mocked(setDoc),
    updateDoc: jest.mocked(updateDoc),
    where: jest.mocked(where),
};

const collectionRef = { id: 'collection-ref' } as ReturnType<typeof collection>;
const documentRef = { id: 'document-ref' } as ReturnType<typeof doc>;
const queryRef = { type: 'query-ref' } as unknown as ReturnType<typeof query>;
const constraint = { type: 'constraint' } as unknown as QueryConstraint;
const whereConstraint = constraint as ReturnType<typeof where>;
const orderConstraint = constraint as ReturnType<typeof orderBy>;
const timestamp = { seconds: 1234567890, nanoseconds: 0 } as unknown as ReturnType<typeof serverTimestamp>;
const currentUser = { uid: 'test-user-123' };

const querySnapshot = (items: Array<{ id: string; data: DocumentData }>) => ({
    docs: items.map(({ id, data }) => ({ id, data: () => data })),
}) as unknown as QuerySnapshot<DocumentData>;

const documentSnapshot = (id: string, data: DocumentData, exists = true) => ({
    id,
    data: () => data,
    exists: () => exists,
}) as unknown as DocumentSnapshot<DocumentData>;

beforeEach(() => {
    jest.clearAllMocks();
    mocks.getAuth.mockReturnValue({ currentUser } as ReturnType<typeof getAuth>);
    mocks.collection.mockReturnValue(collectionRef);
    mocks.doc.mockReturnValue(documentRef);
    mocks.query.mockReturnValue(queryRef);
    mocks.where.mockReturnValue(whereConstraint);
    mocks.orderBy.mockReturnValue(orderConstraint);
    mocks.serverTimestamp.mockReturnValue(timestamp);
    mocks.addDoc.mockResolvedValue({ id: 'created-id' } as Awaited<ReturnType<typeof addDoc>>);
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);
    mocks.getDocs.mockResolvedValue(querySnapshot([]));
    mocks.getDoc.mockResolvedValue(documentSnapshot('document-id', {}));
});

describe('firestoreService', () => {
    it('creates a document with timestamps', async () => {
        await expect(firestoreService.createDocument('items', { name: 'Item' }))
            .resolves.toBe('created-id');
        expect(mocks.collection).toHaveBeenCalledWith(expect.anything(), 'items');
        expect(mocks.addDoc).toHaveBeenCalledWith(collectionRef, {
            name: 'Item',
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    });

    it('creates a document with a custom ID', async () => {
        await firestoreService.createDocumentWithId('items', 'custom-id', { name: 'Item' });
        expect(mocks.doc).toHaveBeenCalledWith(expect.anything(), 'items', 'custom-id');
        expect(mocks.setDoc).toHaveBeenCalledWith(documentRef, {
            name: 'Item',
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    });

    it('gets all documents', async () => {
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'one', data: { name: 'Item' } }]));
        await expect(firestoreService.getDocuments<{ id: string; name: string }>('items'))
            .resolves.toEqual([{ id: 'one', name: 'Item' }]);
    });

    it('gets an existing document and returns null for a missing document', async () => {
        mocks.getDoc.mockResolvedValueOnce(documentSnapshot('one', { name: 'Item' }));
        await expect(firestoreService.getDocument('items', 'one'))
            .resolves.toEqual({ id: 'one', name: 'Item' });

        mocks.getDoc.mockResolvedValueOnce(documentSnapshot('missing', {}, false));
        await expect(firestoreService.getDocument('items', 'missing')).resolves.toBeNull();
    });

    it('updates and deletes documents', async () => {
        await firestoreService.updateDocument('items', 'one', { name: 'Updated' });
        expect(mocks.updateDoc).toHaveBeenCalledWith(documentRef, {
            name: 'Updated',
            updatedAt: timestamp,
        });

        await firestoreService.deleteDocument('items', 'one');
        expect(mocks.deleteDoc).toHaveBeenCalledWith(documentRef);
    });

    it('queries documents with constraints', async () => {
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'one', data: { active: true } }]));
        await expect(firestoreService.queryDocuments('items', [constraint]))
            .resolves.toEqual([{ id: 'one', active: true }]);
        expect(mocks.query).toHaveBeenCalledWith(collectionRef, constraint);
    });

    it.each([
        ['createDocument', () => firestoreService.createDocument('items', {})],
        ['createDocumentWithId', () => firestoreService.createDocumentWithId('items', 'one', {})],
        ['getDocuments', () => firestoreService.getDocuments('items')],
        ['getDocument', () => firestoreService.getDocument('items', 'one')],
        ['updateDocument', () => firestoreService.updateDocument('items', 'one', {})],
        ['deleteDocument', () => firestoreService.deleteDocument('items', 'one')],
        ['queryDocuments', () => firestoreService.queryDocuments('items', [])],
    ])('rethrows errors from %s', async (method, invoke) => {
        const error = new Error(`${method} failed`);
        const dependency = {
            createDocument: mocks.addDoc,
            createDocumentWithId: mocks.setDoc,
            getDocuments: mocks.getDocs,
            getDocument: mocks.getDoc,
            updateDocument: mocks.updateDoc,
            deleteDocument: mocks.deleteDoc,
            queryDocuments: mocks.getDocs,
        }[method];
        dependency!.mockRejectedValueOnce(error);
        await expect(invoke()).rejects.toBe(error);
    });
});

describe('productService reads', () => {
    const productData = { name: 'Keyboard', price: 50, inStock: true };

    it('gets all products', async () => {
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'p1', data: productData }]));
        await expect(productService.getAllProducts()).resolves.toEqual([{ id: 'p1', ...productData }]);
    });

    it('gets an existing product and returns null for a missing product', async () => {
        mocks.getDoc.mockResolvedValueOnce(documentSnapshot('p1', productData));
        await expect(productService.getProduct('p1')).resolves.toEqual({ id: 'p1', ...productData });

        mocks.getDoc.mockResolvedValueOnce(documentSnapshot('missing', {}, false));
        await expect(productService.getProduct('missing')).resolves.toBeNull();
    });

    it('gets products by category', async () => {
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'p1', data: productData }]));
        await productService.getProductsByCategory('Hardware');
        expect(mocks.where).toHaveBeenCalledWith('category', '==', 'Hardware');
        expect(mocks.orderBy).toHaveBeenCalledWith('name', 'asc');
        expect(mocks.query).toHaveBeenCalledWith(collectionRef, constraint, constraint);
    });

    it.each([
        [true, 'asc'],
        [false, 'desc'],
    ])('sorts products by price when ascending is %s', async (ascending, direction) => {
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'p1', data: productData }]));
        await expect(productService.getProductsSortedByPrice(ascending))
            .resolves.toEqual([{ id: 'p1', ...productData }]);
        expect(mocks.orderBy).toHaveBeenCalledWith('price', direction);
    });

    it('uses ascending order by default', async () => {
        await productService.getProductsSortedByPrice();
        expect(mocks.orderBy).toHaveBeenCalledWith('price', 'asc');
    });

    it('gets in-stock products ordered by price', async () => {
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'p1', data: productData }]));
        await expect(productService.getProductsInStock())
            .resolves.toEqual([{ id: 'p1', ...productData }]);
        expect(mocks.where).toHaveBeenCalledWith('inStock', '==', true);
        expect(mocks.orderBy).toHaveBeenCalledWith('price', 'asc');
    });

    it.each([
        ['getAllProducts', 'Failed to fetch products. Check your network and permissions.', () => productService.getAllProducts()],
        ['getProduct', 'Failed to fetch product.', () => productService.getProduct('p1')],
        ['getProductsByCategory', 'Failed to fetch products by category.', () => productService.getProductsByCategory('Hardware')],
        ['getProductsSortedByPrice', 'Failed to fetch sorted products.', () => productService.getProductsSortedByPrice()],
        ['getProductsInStock', 'Failed to fetch products in stock.', () => productService.getProductsInStock()],
    ])('normalizes errors from %s', async (method, message, invoke) => {
        if (method === 'getProduct') {
            mocks.getDoc.mockRejectedValueOnce(new Error('read failed'));
        } else {
            mocks.getDocs.mockRejectedValueOnce(new Error('read failed'));
        }
        await expect(invoke()).rejects.toThrow(message);
    });
});

describe('productService writes', () => {
    const input = { name: 'Keyboard', price: 50, inStock: true };

    it('creates a product for the authenticated user', async () => {
        await expect(productService.createProduct(input)).resolves.toBe('created-id');
        expect(mocks.addDoc).toHaveBeenCalledWith(collectionRef, {
            ...input,
            userId: currentUser.uid,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    });

    it('updates, deletes, and bulk deletes products', async () => {
        await productService.updateProduct('p1', { price: 75 });
        expect(mocks.updateDoc).toHaveBeenCalledWith(documentRef, {
            price: 75,
            updatedAt: timestamp,
        });

        await productService.deleteProduct('p1');
        expect(mocks.deleteDoc).toHaveBeenCalledWith(documentRef);

        await productService.deleteMultipleProducts(['p1', 'p2']);
        expect(mocks.doc).toHaveBeenCalledWith(expect.anything(), 'products', 'p1');
        expect(mocks.doc).toHaveBeenCalledWith(expect.anything(), 'products', 'p2');
        expect(mocks.deleteDoc).toHaveBeenCalledTimes(3);
    });

    it.each([
        ['create', () => productService.createProduct(input), 'You must be authenticated to create a product.'],
        ['update', () => productService.updateProduct('p1', {}), 'You must be authenticated to update a product.'],
        ['delete', () => productService.deleteProduct('p1'), 'You must be authenticated to delete a product.'],
        ['bulk delete', () => productService.deleteMultipleProducts(['p1']), 'You must be authenticated to delete products.'],
    ])('requires authentication to %s products', async (_operation, invoke, message) => {
        mocks.getAuth.mockReturnValue({ currentUser: null } as ReturnType<typeof getAuth>);
        await expect(invoke()).rejects.toThrow(message);
    });

    it.each([
        ['create', mocks.addDoc, () => productService.createProduct(input), 'write access'],
        ['update', mocks.updateDoc, () => productService.updateProduct('p1', {}), 'update access'],
        ['delete', mocks.deleteDoc, () => productService.deleteProduct('p1'), 'delete access'],
    ])('reports permission-denied errors while attempting to %s', async (_operation, dependency, invoke, message) => {
        dependency.mockRejectedValueOnce(new FirebaseError('permission-denied', 'denied'));
        await expect(invoke()).rejects.toThrow(message);
    });

    it.each([
        ['create', mocks.addDoc, () => productService.createProduct(input), 'Failed to create product.'],
        ['update', mocks.updateDoc, () => productService.updateProduct('p1', {}), 'Failed to update product.'],
        ['delete', mocks.deleteDoc, () => productService.deleteProduct('p1'), 'Failed to delete product.'],
        ['bulk delete', mocks.deleteDoc, () => productService.deleteMultipleProducts(['p1']), 'Failed to delete products.'],
    ])('normalizes other errors while attempting to %s', async (_operation, dependency, invoke, message) => {
        dependency.mockRejectedValueOnce(new Error('write failed'));
        await expect(invoke()).rejects.toThrow(message);
    });
});

describe('userService', () => {
    const user = { id: 'u1', email: 'test@example.com' } as User;

    it('delegates all user operations to firestoreService', async () => {
        const create = jest.spyOn(firestoreService, 'createDocument').mockResolvedValue('u1');
        const get = jest.spyOn(firestoreService, 'getDocument').mockResolvedValue(user);
        const getAll = jest.spyOn(firestoreService, 'getDocuments').mockResolvedValue([user]);
        const update = jest.spyOn(firestoreService, 'updateDocument').mockResolvedValue(undefined);
        const remove = jest.spyOn(firestoreService, 'deleteDocument').mockResolvedValue(undefined);
        const queryDocuments = jest.spyOn(firestoreService, 'queryDocuments').mockResolvedValue([user]);

        await expect(userService.createUser({ name: 'Test User', email: user.email })).resolves.toBe('u1');
        await expect(userService.getUser('u1')).resolves.toBe(user);
        await expect(userService.getAllUsers()).resolves.toEqual([user]);
        await expect(userService.updateUser('u1', { email: 'new@example.com' })).resolves.toBeUndefined();
        await expect(userService.deleteUser('u1')).resolves.toBeUndefined();
        await expect(userService.getUsersByEmail(user.email)).resolves.toEqual([user]);

        expect(create).toHaveBeenCalledWith('users', { name: 'Test User', email: user.email });
        expect(get).toHaveBeenCalledWith('users', 'u1');
        expect(getAll).toHaveBeenCalledWith('users');
        expect(update).toHaveBeenCalledWith('users', 'u1', { email: 'new@example.com' });
        expect(remove).toHaveBeenCalledWith('users', 'u1');
        expect(mocks.where).toHaveBeenCalledWith('email', '==', user.email);
        expect(queryDocuments).toHaveBeenCalledWith('users', [constraint]);
    });

    it.each([
        ['createUser', 'createDocument', () => userService.createUser({ name: 'Test User', email: 'test@example.com' }), 'Failed to create user.'],
        ['getUser', 'getDocument', () => userService.getUser('u1'), 'Failed to get user.'],
        ['getAllUsers', 'getDocuments', () => userService.getAllUsers(), 'Failed to get users.'],
        ['updateUser', 'updateDocument', () => userService.updateUser('u1', {}), 'Failed to update user.'],
        ['deleteUser', 'deleteDocument', () => userService.deleteUser('u1'), 'Failed to delete user.'],
        ['getUsersByEmail', 'queryDocuments', () => userService.getUsersByEmail('test@example.com'), 'Failed to get users by email.'],
    ] as const)('normalizes errors from %s', async (_operation, dependency, invoke, message) => {
        jest.spyOn(firestoreService, dependency).mockRejectedValueOnce(new Error('failed'));
        await expect(invoke()).rejects.toThrow(message);
    });
});
