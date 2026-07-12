// app/__tests__/page.integration.real.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../exp4/page';
import { PINECONE_INDEXES } from '@/config/pinecone/pinecone_indexes';

// Only mock external dependencies, not the UI components
jest.mock('@/config/pinecone/pinecone_indexes', () => ({
    PINECONE_INDEXES: [
        {
            label: 'test-index-1',
            indexName: 'test-index-1',
            dimension: 1536,
            metric: 'cosine',
            cloud: 'aws',
            region: 'us-west-2',
        },
        {
            label: 'test-index-2',
            indexName: 'test-index-2',
            dimension: 768,
            metric: 'euclidean',
            cloud: 'gcp',
            region: 'us-central1',
        },
    ],
}));

// Mock next/navigation if used
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

describe('HomePage Real Integration Test', () => {
    it('should render and allow index selection with real components', async () => {
        const user = userEvent.setup();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        render(<HomePage />);

        // Find the select element
        const select = screen.getByRole('combobox');
        expect(select).toBeTruthy();

        // Select an index
        await user.selectOptions(select, 'test-index-1');

        // Verify the selection
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Selected index: test-index-1');
        });

        consoleSpy.mockRestore();
    });

    it('should display index metadata after selection', async () => {
        const user = userEvent.setup();
        render(<HomePage />);

        const select = screen.getByRole('combobox');
        await user.selectOptions(select, 'test-index-1');

        // Check that metadata is displayed
        await waitFor(() => {
            expect(screen.getByText('Selected Index:')).toBeTruthy();
            expect(screen.getByText('Label:').parentElement?.textContent).toContain('test-index-1');
            expect(screen.getByText('Index Name:').parentElement?.textContent).toContain('test-index-1');
        });
    });
});
