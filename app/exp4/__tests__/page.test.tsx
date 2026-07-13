// app/exp4/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import HomePage from '../page';
import { IndexSelector } from '@/components/pinecone/IndexSelector';
import { PINECONE_INDEXES } from '@/config/pinecone/pinecone_indexes';

jest.mock('@/components/pinecone/IndexSelector', () => ({
    IndexSelector: jest.fn(({ indexes }: { indexes: Array<{ indexName: string }> }) => (
        <div data-testid="index-selector">
            {indexes.map((index) => <span key={index.indexName}>{index.indexName}</span>)}
        </div>
    )),
}));

jest.mock('@/config/pinecone/pinecone_indexes', () => ({
    PINECONE_INDEXES: [
        {
            label: 'Production',
            indexName: 'production-embeddings',
            dimension: 1536,
            metric: 'cosine',
            cloud: 'aws',
            region: 'us-west-2',
        },
        {
            label: 'Staging',
            indexName: 'staging-vectors',
            dimension: 768,
            metric: 'euclidean',
            cloud: 'gcp',
            region: 'us-central1',
        },
    ],
}));

describe('Exp4 page', () => {
    it('renders the Pinecone index selector', () => {
        render(<HomePage />);

        expect(screen.getByRole('heading', { name: 'Pinecone Index Selector' })).toBeTruthy();
        expect(screen.getByTestId('index-selector')).toBeTruthy();
        expect(screen.getByText('production-embeddings')).toBeTruthy();
    });

    it('passes the configured indexes to IndexSelector', () => {
        render(<HomePage />);

        const props = (IndexSelector as jest.Mock).mock.calls[0][0];
        expect(props.indexes).toEqual(PINECONE_INDEXES);
        expect(props.onIndexSelected).toEqual(expect.any(Function));
    });
});
