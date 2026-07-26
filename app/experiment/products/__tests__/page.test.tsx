// app/experiment/products/__tests__/page.test.tsx
//
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import ProductPage from '../page';
import { testFirebaseConnection } from '@/lib/firebase/test';

jest.mock('@/lib/firebase/test', () => ({
    testFirebaseConnection: jest.fn(),
}));

// This suite tests the page integration boundary. Mock ProductList completely so
// importing the page does not initialize the Firebase browser SDK.
jest.mock('@/components/product/ProductList', () => ({
    ProductList: jest.fn(() => (
        <div data-testid="product-list-integration">
            <h2>Product List Integration Test</h2>
            <div>Integration Product List</div>
        </div>
    )),
}));

describe('ProductPage Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementation - returns a resolved Promise
        (testFirebaseConnection as jest.Mock).mockResolvedValue('Connected');
    });

    it('should render ProductList with products', async () => {
        render(<ProductPage />);

        // First, wait for the connection to complete
        await waitFor(() => {
            expect(testFirebaseConnection).toHaveBeenCalled();
        });

        // Then wait for the product list to appear
        await waitFor(() => {
            expect(screen.getByTestId('product-list-integration')).toBeInTheDocument();
            expect(screen.getByText('Integration Product List')).toBeInTheDocument();
        });
    });

    it('should maintain page structure with ProductList integration', async () => {
        render(<ProductPage />);

        // Wait for connection to complete
        await waitFor(() => {
            expect(testFirebaseConnection).toHaveBeenCalled();
        });

        // Check page structure
        expect(screen.getByText('Products List')).toBeInTheDocument();
        expect(screen.getByText('Test harness for Firestore products document in trivia database.')).toBeInTheDocument();

        // Check ProductList is rendered within the section
        const section = document.querySelector('.surface-panel');
        expect(section).toBeInTheDocument();

        const productList = screen.getByTestId('product-list-integration');
        expect(productList).toBeInTheDocument();
        expect(productList.closest('.surface-panel')).toBe(section);
    });

    it('should handle Firebase connection in integration test', async () => {
        const mockTestFirebaseConnection = testFirebaseConnection as jest.Mock;
        mockTestFirebaseConnection.mockResolvedValue('Connected');

        render(<ProductPage />);

        await waitFor(() => {
            expect(mockTestFirebaseConnection).toHaveBeenCalled();
        });

        expect(screen.getByText('Products List')).toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
        // Mock a delayed promise to test loading state
        let resolveConnection: (value: string) => void;
        const connectionPromise = new Promise<string>((resolve) => {
            resolveConnection = resolve;
        });
        (testFirebaseConnection as jest.Mock).mockImplementation(() => connectionPromise);

        render(<ProductPage />);

        // Check loading state is shown
        expect(screen.getByTestId('connection-loading')).toBeInTheDocument();
        expect(screen.getByText('Connecting to Firebase...')).toBeInTheDocument();

        // Resolve the connection
        resolveConnection!('Connected');

        // Wait for product list to appear
        await waitFor(() => {
            expect(screen.getByTestId('product-list-integration')).toBeInTheDocument();
        });
    });

    it('should handle connection error state', async () => {
        const mockTestFirebaseConnection = testFirebaseConnection as jest.Mock;
        const errorMessage = 'Firebase connection failed';
        mockTestFirebaseConnection.mockRejectedValue(new Error(errorMessage));

        render(<ProductPage />);

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByTestId('connection-error')).toBeInTheDocument();
            expect(screen.getByText('Connection Error')).toBeInTheDocument();
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(screen.getByTestId('retry-button')).toBeInTheDocument();
        });
    });

    it('should retry connection when retry button is clicked', async () => {
        const mockTestFirebaseConnection = testFirebaseConnection as jest.Mock;
        // First call fails
        mockTestFirebaseConnection.mockRejectedValueOnce(new Error('Connection failed'));
        // Second call succeeds
        mockTestFirebaseConnection.mockResolvedValueOnce('Connected');

        render(<ProductPage />);

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByTestId('connection-error')).toBeInTheDocument();
        });

        // Click retry button
        const retryButton = screen.getByTestId('retry-button');
        retryButton.click();

        // Wait for product list to appear after retry
        await waitFor(() => {
            expect(screen.getByTestId('product-list-integration')).toBeInTheDocument();
        });

        // Should have been called twice (initial + retry)
        expect(mockTestFirebaseConnection).toHaveBeenCalledTimes(2);
    });
});
