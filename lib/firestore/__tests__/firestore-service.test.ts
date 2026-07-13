import type { DocumentData, DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';

jest.mock('../../firebase/client', () => ({
    db: { type: 'mock-firestore' },
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
    limit: jest.fn(),
    Timestamp: { now: jest.fn() },
}));

import {
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { firestoreService, productService, userService } from '../firestore-service';
import type { Product, User } from '../types';

const mocks = {
    addDoc: addDoc as jest.MockedFunction<typeof addDoc>,
    collection: collection as jest.MockedFunction<typeof collection>,
    deleteDoc: deleteDoc as jest.MockedFunction<typeof deleteDoc>,
    doc: doc as jest.MockedFunction<typeof doc>,
    getDoc: getDoc as jest.MockedFunction<typeof getDoc>,
    getDocs: getDocs as jest.MockedFunction<typeof getDocs>,
    orderBy: orderBy as jest.MockedFunction<typeof orderBy>,
    query: query as jest.MockedFunction<typeof query>,
    setDoc: setDoc as jest.MockedFunction<typeof setDoc>,
    updateDoc: updateDoc as jest.MockedFunction<typeof updateDoc>,
    where: where as jest.MockedFunction<typeof where>,
    timestampNow: Timestamp.now as jest.MockedFunction<typeof Timestamp.now>,
};

const collectionRef = { id: 'collection-ref' } as ReturnType<typeof collection>;
const documentRef = { id: 'document-ref' } as ReturnType<typeof doc>;
const queryRef = { type: 'query-ref' } as unknown as ReturnType<typeof query>;
const timestamp = { seconds: 1, nanoseconds: 0 } as ReturnType<typeof Timestamp.now>;

const querySnapshot = (items: Array<{ id: string; data: DocumentData }>) => ({
    docs: items.map(({ id, data }) => ({ id, data: () => data })),
}) as unknown as QuerySnapshot<DocumentData>;

const documentSnapshot = (
    id: string,
    data: DocumentData,
    exists = true,
) => ({
    id,
    data: () => data,
    exists: () => exists,
}) as unknown as DocumentSnapshot<DocumentData>;

describe('firestoreService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mocks.collection.mockReturnValue(collectionRef);
        mocks.doc.mockReturnValue(documentRef);
        mocks.query.mockReturnValue(queryRef);
        mocks.timestampNow.mockReturnValue(timestamp);
        mocks.setDoc.mockResolvedValue(undefined);
        mocks.updateDoc.mockResolvedValue(undefined);
        mocks.deleteDoc.mockResolvedValue(undefined);
    });

    it('creates documents with generated and custom IDs', async () => {
        mocks.addDoc.mockResolvedValue({ id: 'created-id' } as Awaited<ReturnType<typeof addDoc>>);

        await expect(firestoreService.createDocument('items', { name: 'Item' }))
            .resolves.toBe('created-id');
        expect(mocks.addDoc).toHaveBeenCalledWith(collectionRef, {
            name: 'Item',
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        await expect(firestoreService.createDocumentWithId('items', 'custom-id', { name: 'Item' }))
            .resolves.toBeUndefined();
        expect(mocks.doc).toHaveBeenCalledWith(expect.anything(), 'items', 'custom-id');
        expect(mocks.setDoc).toHaveBeenCalledWith(documentRef, {
            name: 'Item',
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    });

    it('reads collections and individual documents', async () => {
        mocks.getDocs.mockResolvedValue(querySnapshot([
            { id: 'one', data: { name: 'First' } },
            { id: 'two', data: { name: 'Second' } },
        ]));

        await expect(firestoreService.getDocuments<{ id: string; name: string }>('items'))
            .resolves.toEqual([
                { id: 'one', name: 'First' },
                { id: 'two', name: 'Second' },
            ]);

        mocks.getDoc.mockResolvedValue(documentSnapshot('one', { name: 'First' }));
        await expect(firestoreService.getDocument<{ id: string; name: string }>('items', 'one'))
            .resolves.toEqual({ id: 'one', name: 'First' });

        mocks.getDoc.mockResolvedValue(documentSnapshot('missing', {}, false));
        await expect(firestoreService.getDocument('items', 'missing')).resolves.toBeNull();
    });

    it('updates, deletes, and queries documents', async () => {
        await firestoreService.updateDocument('items', 'one', { name: 'Updated' });
        expect(mocks.updateDoc).toHaveBeenCalledWith(documentRef, {
            name: 'Updated',
            updatedAt: timestamp,
        });

        await firestoreService.deleteDocument('items', 'one');
        expect(mocks.deleteDoc).toHaveBeenCalledWith(documentRef);

        const constraint = { type: 'constraint' } as unknown as ReturnType<typeof where>;
        mocks.getDocs.mockResolvedValue(querySnapshot([{ id: 'one', data: { active: true } }]));
        await expect(firestoreService.queryDocuments('items', [constraint]))
            .resolves.toEqual([{ id: 'one', active: true }]);
        expect(mocks.query).toHaveBeenCalledWith(collectionRef, constraint);
    });

    it.each([
        ['createDocument', 'Error creating document:', () => {
            mocks.addDoc.mockRejectedValueOnce(new Error('create failed'));
            return firestoreService.createDocument('items', {});
        }],
        ['createDocumentWithId', 'Error creating document with ID:', () => {
            mocks.setDoc.mockRejectedValueOnce(new Error('set failed'));
            return firestoreService.createDocumentWithId('items', 'one', {});
        }],
        ['getDocuments', 'Error getting documents:', () => {
            mocks.getDocs.mockRejectedValueOnce(new Error('list failed'));
            return firestoreService.getDocuments('items');
        }],
        ['getDocument', 'Error getting document:', () => {
            mocks.getDoc.mockRejectedValueOnce(new Error('get failed'));
            return firestoreService.getDocument('items', 'one');
        }],
        ['updateDocument', 'Error updating document:', () => {
            mocks.updateDoc.mockRejectedValueOnce(new Error('update failed'));
            return firestoreService.updateDocument('items', 'one', {});
        }],
        ['deleteDocument', 'Error deleting document:', () => {
            mocks.deleteDoc.mockRejectedValueOnce(new Error('delete failed'));
            return firestoreService.deleteDocument('items', 'one');
        }],
        ['queryDocuments', 'Error querying documents:', () => {
            mocks.getDocs.mockRejectedValueOnce(new Error('query failed'));
            return firestoreService.queryDocuments('items', []);
        }],
    ])('logs and rethrows errors from %s', async (_name, message, operation) => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        await expect(operation()).rejects.toBeInstanceOf(Error);
        expect(consoleError).toHaveBeenCalledWith(message, expect.any(Error));
        consoleError.mockRestore();
    });
});

describe('collection-specific services', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('delegates every user operation to firestoreService', async () => {
        const user = { name: 'Ada', email: 'ada@example.com' };
        const create = jest.spyOn(firestoreService, 'createDocument').mockResolvedValue('user-id');
        const getOne = jest.spyOn(firestoreService, 'getDocument').mockResolvedValue(null);
        const getAll = jest.spyOn(firestoreService, 'getDocuments').mockResolvedValue([]);
        const update = jest.spyOn(firestoreService, 'updateDocument').mockResolvedValue(undefined);
        const remove = jest.spyOn(firestoreService, 'deleteDocument').mockResolvedValue(undefined);
        const queryDocs = jest.spyOn(firestoreService, 'queryDocuments').mockResolvedValue([]);
        mocks.where.mockReturnValue({ type: 'email-filter' } as unknown as ReturnType<typeof where>);

        await userService.createUser(user);
        await userService.getUser('user-id');
        await userService.getAllUsers();
        await userService.updateUser('user-id', { name: 'Grace' });
        await userService.deleteUser('user-id');
        await userService.getUsersByEmail('ada@example.com');

        expect(create).toHaveBeenCalledWith('users', user as User);
        expect(getOne).toHaveBeenCalledWith('users', 'user-id');
        expect(getAll).toHaveBeenCalledWith('users');
        expect(update).toHaveBeenCalledWith('users', 'user-id', { name: 'Grace' });
        expect(remove).toHaveBeenCalledWith('users', 'user-id');
        expect(queryDocs).toHaveBeenCalledWith('users', [{ type: 'email-filter' }]);
    });

    it('delegates every product operation and builds query constraints', async () => {
        const product = {
            name: 'Keyboard',
            price: 50,
            description: 'Mechanical keyboard',
            category: 'electronics',
            inStock: true,
        };
        const create = jest.spyOn(firestoreService, 'createDocument').mockResolvedValue('product-id');
        const getOne = jest.spyOn(firestoreService, 'getDocument').mockResolvedValue(null);
        const getAll = jest.spyOn(firestoreService, 'getDocuments').mockResolvedValue([]);
        const update = jest.spyOn(firestoreService, 'updateDocument').mockResolvedValue(undefined);
        const remove = jest.spyOn(firestoreService, 'deleteDocument').mockResolvedValue(undefined);
        const queryDocs = jest.spyOn(firestoreService, 'queryDocuments').mockResolvedValue([]);
        mocks.where
            .mockReturnValueOnce({ type: 'category-filter' } as unknown as ReturnType<typeof where>)
            .mockReturnValueOnce({ type: 'stock-filter' } as unknown as ReturnType<typeof where>);
        mocks.orderBy
            .mockReturnValueOnce({ type: 'name-order' } as unknown as ReturnType<typeof orderBy>)
            .mockReturnValueOnce({ type: 'price-order' } as unknown as ReturnType<typeof orderBy>);

        await productService.createProduct(product);
        await productService.getProduct('product-id');
        await productService.getAllProducts();
        await productService.updateProduct('product-id', { price: 60 });
        await productService.deleteProduct('product-id');
        await productService.getProductsByCategory('electronics');
        await productService.getProductsInStock();

        expect(create).toHaveBeenCalledWith('products', product as Product);
        expect(getOne).toHaveBeenCalledWith('products', 'product-id');
        expect(getAll).toHaveBeenCalledWith('products');
        expect(update).toHaveBeenCalledWith('products', 'product-id', { price: 60 });
        expect(remove).toHaveBeenCalledWith('products', 'product-id');
        expect(queryDocs).toHaveBeenNthCalledWith(1, 'products', [
            { type: 'category-filter' },
            { type: 'name-order' },
        ]);
        expect(queryDocs).toHaveBeenNthCalledWith(2, 'products', [
            { type: 'stock-filter' },
            { type: 'price-order' },
        ]);
    });
});
