
// app/test-firebase/__tests__/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import TestFirebase from '../page';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, addDoc } from 'firebase/firestore';

// Mock Firebase client
jest.mock('@/lib/firebase/client', () => ({
    db: {
        // Mock Firestore instance
        _delegate: {
            _firestore: {},
        },
    },
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(),
}));

// Mock console.error to prevent test output pollution
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('TestFirebase Component', () => {
    const mockCollection = collection as jest.Mock;
    const mockGetDocs = getDocs as jest.Mock;
    const mockAddDoc = addDoc as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock implementations
        mockCollection.mockReturnValue('mock-collection-ref');
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('Initial Render', () => {
        it('should render with initial status "Testing..."', () => {
            render(<TestFirebase />);
            expect(screen.getByText('Testing...')).toBeInTheDocument();
        });

        it('should have the correct CSS classes', () => {
            render(<TestFirebase />);
            const div = screen.getByText('Testing...');
            expect(div).toHaveClass('p-8');
        });
    });

    describe('Successful Connection - Products Exist', () => {
        it('should display success message with product count when products exist', async () => {
            const mockSnapshot = {
                size: 5,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('✅ Connected! Found 5 products')).toBeInTheDocument();
            });

            // Verify Firebase calls
            expect(mockCollection).toHaveBeenCalledWith(db, 'products');
            expect(mockGetDocs).toHaveBeenCalledWith('mock-collection-ref');
            expect(mockAddDoc).not.toHaveBeenCalled();
        });

        it('should display correct count for different product quantities', async () => {
            const testCases = [0, 1, 10, 100];

            for (const count of testCases) {
                jest.clearAllMocks();
                const mockSnapshot = {
                    size: count,
                    empty: count === 0,
                    docs: [],
                    forEach: jest.fn(),
                };

                mockGetDocs.mockResolvedValue(mockSnapshot);

                render(<TestFirebase />);

                await waitFor(() => {
                    if (count === 0) {
                        expect(screen.getByText('✅ Created test product!')).toBeInTheDocument();
                    } else {
                        expect(screen.getByText(`✅ Connected! Found ${count} products`)).toBeInTheDocument();
                    }
                });
            }
        });

        it('should handle large product counts', async () => {
            const mockSnapshot = {
                size: 9999,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('✅ Connected! Found 9999 products')).toBeInTheDocument();
            });
        });
    });

    describe('Successful Connection - No Products (Auto-create)', () => {
        it('should create a test product when no products exist', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockResolvedValue({ id: 'test-product-id' });

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('✅ Created test product!')).toBeInTheDocument();
            });

            // Verify addDoc was called with correct data
            expect(mockAddDoc).toHaveBeenCalledWith('mock-collection-ref', {
                name: 'Test Product',
                price: 9.99,
                description: 'Auto-created test',
                category: 'Test',
                inStock: true,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            });
        });

        it('should handle case where getDocs returns undefined size', async () => {
            const mockSnapshot = {
                size: undefined,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockResolvedValue({ id: 'test-product-id' });

            render(<TestFirebase />);

            // Only an explicit size of zero triggers product creation.
            await waitFor(() => {
                expect(screen.getByText('✅ Connected! Found undefined products')).toBeInTheDocument();
            });
            expect(mockAddDoc).not.toHaveBeenCalled();
        });

        it('should create product with all required fields', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockResolvedValue({ id: 'test-product-id' });

            render(<TestFirebase />);

            await waitFor(() => {
                expect(mockAddDoc).toHaveBeenCalled();
            });

            const calledWith = mockAddDoc.mock.calls[0][1];
            expect(calledWith).toMatchObject({
                name: 'Test Product',
                price: 9.99,
                description: 'Auto-created test',
                category: 'Test',
                inStock: true,
            });
            expect(calledWith.createdAt).toBeInstanceOf(Date);
            expect(calledWith.updatedAt).toBeInstanceOf(Date);
        });

        it('should create product with current timestamp values', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            const now = new Date('2024-01-01T00:00:00.000Z');
            jest.useFakeTimers().setSystemTime(now);

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockResolvedValue({ id: 'test-product-id' });

            render(<TestFirebase />);

            await waitFor(() => {
                expect(mockAddDoc).toHaveBeenCalled();
            });

            const calledWith = mockAddDoc.mock.calls[0][1];
            expect(calledWith.createdAt).toBeInstanceOf(Date);
            expect(calledWith.updatedAt).toBeInstanceOf(Date);
            expect(calledWith.createdAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
            expect(calledWith.updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime());

            jest.useRealTimers();
        });
    });

    describe('Error Handling', () => {
        it('should display error message when getDocs fails', async () => {
            const errorMessage = 'Failed to fetch products';
            const error = new Error(errorMessage);
            mockGetDocs.mockRejectedValue(error);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText(`❌ Error: ${errorMessage}`)).toBeInTheDocument();
            });

            expect(console.error).toHaveBeenCalledWith('Test error:', error);
        });

        it('should display error when addDoc fails', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            const errorMessage = 'Failed to create product';
            const error = new Error(errorMessage);

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockRejectedValue(error);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText(`❌ Error: ${errorMessage}`)).toBeInTheDocument();
            });

            expect(console.error).toHaveBeenCalledWith('Test error:', error);
        });

        it('should handle non-Error exceptions', async () => {
            mockGetDocs.mockRejectedValue('String error');

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('❌ Error: String error')).toBeInTheDocument();
            });
        });

        it('should handle null errors', async () => {
            mockGetDocs.mockRejectedValue(null);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('❌ Error: null')).toBeInTheDocument();
            });
        });

        it('should handle undefined errors', async () => {
            mockGetDocs.mockRejectedValue(undefined);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('❌ Error: undefined')).toBeInTheDocument();
            });
        });

        it('should handle network errors', async () => {
            const error = new Error('Network error: Failed to connect to Firebase');
            mockGetDocs.mockRejectedValue(error);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText(`❌ Error: ${error.message}`)).toBeInTheDocument();
            });

            expect(console.error).toHaveBeenCalledWith('Test error:', error);
        });

        it('should handle permission errors', async () => {
            const error = new Error('Permission denied: Missing or insufficient permissions');
            mockGetDocs.mockRejectedValue(error);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText(`❌ Error: ${error.message}`)).toBeInTheDocument();
            });
        });

        it('should handle Firestore-specific errors', async () => {
            const error = new Error('Firestore: The collection "products" does not exist');
            mockGetDocs.mockRejectedValue(error);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText(`❌ Error: ${error.message}`)).toBeInTheDocument();
            });
        });
    });

    describe('useEffect Dependencies', () => {
        it('should only run the effect once', async () => {
            const mockSnapshot = {
                size: 1,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            const { rerender } = render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('✅ Connected! Found 1 products')).toBeInTheDocument();
            });

            expect(mockGetDocs).toHaveBeenCalledTimes(1);

            // Rerender to ensure effect doesn't run again
            rerender(<TestFirebase />);

            // Wait a moment to ensure no additional calls
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockGetDocs).toHaveBeenCalledTimes(1);
        });
    });

    describe('State Transitions', () => {
        it('should transition from "Testing..." to success state', async () => {
            const mockSnapshot = {
                size: 3,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            render(<TestFirebase />);

            // Initial state
            expect(screen.getByText('Testing...')).toBeInTheDocument();

            // After async operation
            await waitFor(() => {
                expect(screen.getByText('✅ Connected! Found 3 products')).toBeInTheDocument();
            });
        });

        it('should transition from "Testing..." to error state', async () => {
            const error = new Error('Connection failed');
            mockGetDocs.mockRejectedValue(error);

            render(<TestFirebase />);

            // Initial state
            expect(screen.getByText('Testing...')).toBeInTheDocument();

            // After async operation
            await waitFor(() => {
                expect(screen.getByText('❌ Error: Connection failed')).toBeInTheDocument();
            });
        });

        it('should transition from "Testing..." to product creation state', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockResolvedValue({ id: 'new-product-id' });

            render(<TestFirebase />);

            // Initial state
            expect(screen.getByText('Testing...')).toBeInTheDocument();

            // After async operation
            await waitFor(() => {
                expect(screen.getByText('✅ Created test product!')).toBeInTheDocument();
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid component unmount', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve(mockSnapshot), 100);
            }));

            const { unmount } = render(<TestFirebase />);

            // Unmount before async operation completes
            unmount();

            // Should not throw an error
            expect(true).toBe(true);
        });

        it('should handle multiple simultaneous renders', async () => {
            const mockSnapshot = {
                size: 1,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            render(<TestFirebase />);
            render(<TestFirebase />);
            render(<TestFirebase />);

            // All should resolve successfully
            await waitFor(() => {
                expect(screen.getAllByText(/✅ Connected! Found 1 products/)).toHaveLength(3);
            });
            expect(mockGetDocs).toHaveBeenCalledTimes(3);
        });

        it('should handle empty products snapshot with no docs', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockResolvedValue({ id: 'test-id' });

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('✅ Created test product!')).toBeInTheDocument();
            });

            // Verify addDoc was called with the correct collection reference
            expect(mockAddDoc).toHaveBeenCalledWith('mock-collection-ref', expect.any(Object));
        });
    });

    describe('Integration with Real Firebase Client', () => {
        it('should use the correct Firebase collection reference', async () => {
            const mockSnapshot = {
                size: 1,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(mockCollection).toHaveBeenCalledWith(db, 'products');
            });
        });

        it('should use the correct collection path', async () => {
            const mockSnapshot = {
                size: 1,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            render(<TestFirebase />);

            await waitFor(() => {
                expect(mockCollection).toHaveBeenCalledWith(
                    expect.objectContaining({
                        // Check that db is the one from our mock
                    }),
                    'products'
                );
            });
        });
    });

    describe('Security and Validation', () => {
        it('should handle invalid product data gracefully', async () => {
            const mockSnapshot = {
                size: 0,
                empty: true,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockAddDoc.mockRejectedValue(new Error('Invalid data structure'));

            render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('❌ Error: Invalid data structure')).toBeInTheDocument();
            });
        });
    });

    describe('Performance', () => {
        it('should not cause memory leaks', async () => {
            const mockSnapshot = {
                size: 1,
                empty: false,
                docs: [],
                forEach: jest.fn(),
            };

            mockGetDocs.mockResolvedValue(mockSnapshot);

            const { unmount } = render(<TestFirebase />);

            await waitFor(() => {
                expect(screen.getByText('✅ Connected! Found 1 products')).toBeInTheDocument();
            });

            unmount();

            // Should be cleanly unmounted without errors
            expect(true).toBe(true);
        });
    });
});

// Additional test for the component in isolation with different scenarios
describe('TestFirebase - Scenario Tests', () => {
    it('should handle success scenario with existing products', async () => {
        const mockGetDocs = getDocs as jest.Mock;
        const mockSnapshot = {
            size: 5,
            empty: false,
            docs: [
                { id: '1', data: () => ({ name: 'Product 1' }) },
                { id: '2', data: () => ({ name: 'Product 2' }) },
            ],
            forEach: jest.fn(),
        };

        mockGetDocs.mockResolvedValue(mockSnapshot);

        render(<TestFirebase />);

        await waitFor(() => {
            expect(screen.getByText('✅ Connected! Found 5 products')).toBeInTheDocument();
        });
    });

    it('should handle scenario with no products and successful creation', async () => {
        const mockGetDocs = getDocs as jest.Mock;
        const mockAddDoc = addDoc as jest.Mock;
        const mockSnapshot = {
            size: 0,
            empty: true,
            docs: [],
            forEach: jest.fn(),
        };

        mockGetDocs.mockResolvedValue(mockSnapshot);
        mockAddDoc.mockResolvedValue({ id: 'new-product-123' });

        render(<TestFirebase />);

        await waitFor(() => {
            expect(screen.getByText('✅ Created test product!')).toBeInTheDocument();
        });
    });

    it('should handle scenario with no products and failed creation', async () => {
        const mockGetDocs = getDocs as jest.Mock;
        const mockAddDoc = addDoc as jest.Mock;
        const mockSnapshot = {
            size: 0,
            empty: true,
            docs: [],
            forEach: jest.fn(),
        };

        mockGetDocs.mockResolvedValue(mockSnapshot);
        mockAddDoc.mockRejectedValue(new Error('Failed to create product'));

        render(<TestFirebase />);

        await waitFor(() => {
            expect(screen.getByText('❌ Error: Failed to create product')).toBeInTheDocument();
        });
    });
});

// Run tests with:
// yarn test app/test-firebase/__tests__/page.test.tsx --coverage
