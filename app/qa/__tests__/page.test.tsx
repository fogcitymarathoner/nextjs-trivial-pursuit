import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import QaPage from '../page';
import { PINECONE_INDEXES } from '@/config/pinecone/pinecone_indexes';
import { QaClient } from '../qa-client';

jest.mock('@/config/pinecone/pinecone_indexes', () => ({
  PINECONE_INDEXES: [
    {
      label: 'Production Index',
      indexName: 'prod-index',
      description: 'Production environment',
    },
    {
      label: 'Missing Index Name',
      indexName: '',
      description: 'Should still be visible in the dropdown',
    },
  ],
}));

jest.mock('../qa-client', () => ({
  QaClient: jest.fn(({ indexes }) => (
    <main data-testid="qa-client">
      <h1>Q&A</h1>
      <span data-testid="index-count">{indexes.length}</span>
      {indexes.map((index: { label: string; indexName: string }) => (
        <span key={index.label} data-testid="index-label">
          {index.label}:{index.indexName}
        </span>
      ))}
    </main>
  )),
}));

describe('QA Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PINECONE_INDEXES.splice(
      0,
      PINECONE_INDEXES.length,
      {
        label: 'Production Index',
        indexName: 'prod-index',
        description: 'Production environment',
      },
      {
        label: 'Missing Index Name',
        indexName: '',
        description: 'Should still be visible in the dropdown',
      },
    );
  });

  it('renders the QA client', () => {
    render(<QaPage />);

    expect(screen.getByTestId('qa-client')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Q&A' })).toBeInTheDocument();
  });

  it('passes all configured index labels to the client', () => {
    render(<QaPage />);

    expect(screen.getByTestId('index-count')).toHaveTextContent('2');
    expect(screen.getByText('Production Index:prod-index')).toBeInTheDocument();
    expect(screen.getByText('Missing Index Name:')).toBeInTheDocument();
  });

  it('passes an empty index list when no indexes are configured', () => {
    PINECONE_INDEXES.splice(0, PINECONE_INDEXES.length);

    render(<QaPage />);

    expect(screen.getByTestId('index-count')).toHaveTextContent('0');
  });

  it('uses the mocked client boundary instead of rendering child controls', () => {
    render(<QaPage />);

    expect(QaClient).toHaveBeenCalledWith(
      {
        indexes: [
          {
            label: 'Production Index',
            indexName: 'prod-index',
            description: 'Production environment',
          },
          {
            label: 'Missing Index Name',
            indexName: '',
            description: 'Should still be visible in the dropdown',
          },
        ],
      },
      undefined,
    );
  });
});
