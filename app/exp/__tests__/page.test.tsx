/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomePage from '../page';
import '@testing-library/jest-dom';
import type { PineconeIndexOption } from '@/config/pinecone/types';

const expectedIndex: PineconeIndexOption = {
  label: 'Presidents',
  indexName: 'test-index',
  description: 'Historical president documents',
};

const mockIndexesForSelector: PineconeIndexOption[] = [expectedIndex];

jest.mock('@/config/pinecone/pinecone_indexes', () => ({
  PINECONE_INDEXES: [
    {
      label: 'Presidents',
      indexName: 'test-index',
      description: 'Historical president documents',
    },
  ],
}));

jest.mock('@/components/pinecone/IndexSelector', () => ({
  IndexSelector: ({
    indexes,
    onIndexSelected,
  }: {
    indexes: PineconeIndexOption[];
    onIndexSelected?: (index: PineconeIndexOption) => void | Promise<void>;
  }) => (
    <div data-testid="index-selector">
      <span>indexes: {indexes.length}</span>
      <button onClick={() => onIndexSelected?.(mockIndexesForSelector[0])}>Select Presidents</button>
    </div>
  ),
}));

describe('Exp HomePage', () => {
  it('renders the Pinecone index selector with configured indexes', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Pinecone Index Selector' })).toBeInTheDocument();
    expect(screen.getByTestId('index-selector')).toHaveTextContent('indexes: 1');
  });

  it('handles selected index on the server action callback', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Select Presidents' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(`Selected index: ${expectedIndex.indexName}`);
    });

    consoleSpy.mockRestore();
  });
});
