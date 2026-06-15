/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { PineconeDropdown } from '../PineconeDropdown';
import '@testing-library/jest-dom';
import type { PineconeIndexOption } from '@/config/pinecone/types';

describe('PineconeDropdown', () => {
  const indexes: PineconeIndexOption[] = [
    {
      label: 'Production Index',
      indexName: 'prod-index',
      description: 'Main production index',
    },
    {
      label: 'Development Index',
      indexName: 'dev-index',
    },
  ];

  it('renders placeholder and provided indexes', () => {
    render(<PineconeDropdown indexes={indexes} />);

    expect(screen.getByRole('option', { name: 'Select a Pinecone index...' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Production Index - Main production index' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Development Index' })).toBeInTheDocument();
  });

  it('uses default value and custom styling', () => {
    render(<PineconeDropdown indexes={indexes} defaultValue="prod-index" className="custom-dropdown" />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('prod-index');
    expect(select).toHaveClass('custom-dropdown');
  });

  it('calls onSelect when a known index is selected', () => {
    const onSelect = jest.fn();
    render(<PineconeDropdown indexes={indexes} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dev-index' } });

    expect(onSelect).toHaveBeenCalledWith(indexes[1]);
  });

  it('does not call onSelect for the placeholder or when no handler is provided', () => {
    const onSelect = jest.fn();
    render(<PineconeDropdown indexes={indexes} onSelect={onSelect} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(onSelect).not.toHaveBeenCalled();

    render(<PineconeDropdown indexes={indexes} />);
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'prod-index' } });
  });

  it('uses the label as the option value when an index name is not configured', () => {
    const onSelect = jest.fn();
    const unconfiguredIndexes: PineconeIndexOption[] = [
      {
        label: 'Presidents',
        indexName: '',
        description: 'Historical president documents',
      },
    ];

    render(
      <PineconeDropdown
        indexes={unconfiguredIndexes}
        defaultValue="Presidents"
        onSelect={onSelect}
      />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('Presidents');
    expect(screen.getByRole('option', { name: 'Presidents - Historical president documents' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'Presidents' } });

    expect(onSelect).toHaveBeenCalledWith(unconfiguredIndexes[0]);
  });
});
