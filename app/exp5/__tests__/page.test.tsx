// app/exp5/__tests__/page.test.tsx
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
jest.mock('@/components/ProductList', () => ({
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
    });

    it('should render ProductList with products', async () => {
        render(<ProductPage />);

        await waitFor(() => {
            expect(screen.getByTestId('product-list-integration')).toBeInTheDocument();
            expect(screen.getByText('Integration Product List')).toBeInTheDocument();
        });
    });

    it('should maintain page structure with ProductList integration', () => {
        render(<ProductPage />);

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
});

// Run integration tests:
// yarn test app/__tests__/ProductPage.integration.test.tsx
