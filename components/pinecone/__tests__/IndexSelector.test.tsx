/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { IndexSelector } from '../IndexSelector';
import '@testing-library/jest-dom';
import type { PineconeIndexOption } from '@/config/pinecone/types';

// Mock the PineconeDropdown component
jest.mock('../PineconeDropdown', () => ({
  PineconeDropdown: ({ indexes, onSelect }: { indexes: PineconeIndexOption[]; onSelect: (index: PineconeIndexOption) => void }) => (
    <div data-testid="pinecone-dropdown">
      {indexes.map((index) => (
        <button
          key={index.indexName}
          data-testid={`index-option-${index.indexName}`}
          onClick={() => onSelect(index)}
        >
          {index.label}
        </button>
      ))}
    </div>
  ),
}));

describe('IndexSelector', () => {
  const mockIndexes: PineconeIndexOption[] = [
    {
      label: 'Production Index',
      indexName: 'prod-index',
      description: 'Main production index',
    },
    {
      label: 'Development Index',
      indexName: 'dev-index',
      description: 'Development environment',
    },
    {
      label: 'Test Index',
      indexName: 'test-index',
    },
  ];

  it('renders without crashing', () => {
    render(<IndexSelector indexes={mockIndexes} />);
    expect(screen.getByTestId('pinecone-dropdown')).toBeInTheDocument();
  });

  it('displays the PineconeDropdown component with provided indexes', () => {
    render(<IndexSelector indexes={mockIndexes} />);

    expect(screen.getByText('Production Index')).toBeInTheDocument();
    expect(screen.getByText('Development Index')).toBeInTheDocument();
    expect(screen.getByText('Test Index')).toBeInTheDocument();
  });

  it('does not display selected index info initially', () => {
    render(<IndexSelector indexes={mockIndexes} />);

    expect(screen.queryByText('Selected Index:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Label:/)).not.toBeInTheDocument();
  });

  it('displays selected index info after selection', () => {
    render(<IndexSelector indexes={mockIndexes} />);

    const prodButton = screen.getByTestId('index-option-prod-index');
    fireEvent.click(prodButton);

    const infoPanel = document.querySelector('.mt-4.p-4.bg-blue-50.rounded-lg');
    expect(screen.getByText('Selected Index:')).toBeInTheDocument();
    expect(infoPanel).toHaveTextContent('Label: Production Index');
    expect(infoPanel).toHaveTextContent('Index Name: prod-index');
    expect(infoPanel).toHaveTextContent('Description: Main production index');
  });

  it('does not show description when not provided', () => {
    render(<IndexSelector indexes={mockIndexes} />);

    const testButton = screen.getByTestId('index-option-test-index');
    fireEvent.click(testButton);

    const infoPanel = document.querySelector('.mt-4.p-4.bg-blue-50.rounded-lg');
    expect(screen.getByText('Selected Index:')).toBeInTheDocument();
    expect(infoPanel).toHaveTextContent('Label: Test Index');
    expect(infoPanel).toHaveTextContent('Index Name: test-index');
    expect(infoPanel).not.toHaveTextContent('Description:');
  });

  it('calls onIndexSelected callback when an index is selected', () => {
    const mockOnIndexSelected = jest.fn();
    render(<IndexSelector indexes={mockIndexes} onIndexSelected={mockOnIndexSelected} />);

    const devButton = screen.getByTestId('index-option-dev-index');
    fireEvent.click(devButton);

    expect(mockOnIndexSelected).toHaveBeenCalledTimes(1);
    expect(mockOnIndexSelected).toHaveBeenCalledWith(mockIndexes[1]);
  });

  it('updates selected index when a different index is selected', () => {
    render(<IndexSelector indexes={mockIndexes} />);

    // Select first index
    const prodButton = screen.getByTestId('index-option-prod-index');
    fireEvent.click(prodButton);

    let infoPanel = document.querySelector('.mt-4.p-4.bg-blue-50.rounded-lg');
    expect(infoPanel).toHaveTextContent('Production Index');

    // Select second index
    const devButton = screen.getByTestId('index-option-dev-index');
    fireEvent.click(devButton);

    infoPanel = document.querySelector('.mt-4.p-4.bg-blue-50.rounded-lg');
    expect(infoPanel).toHaveTextContent('Development Index');
    expect(infoPanel).not.toHaveTextContent('Production Index');
  });

  it('handles empty indexes array gracefully', () => {
    render(<IndexSelector indexes={[]} />);

    expect(screen.getByTestId('pinecone-dropdown')).toBeInTheDocument();
    expect(screen.queryByText('Selected Index:')).not.toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    render(<IndexSelector indexes={mockIndexes} />);

    const container = document.querySelector('.space-y-4');
    expect(container).toBeInTheDocument();

    // Select an index to show the info panel
    const prodButton = screen.getByTestId('index-option-prod-index');
    fireEvent.click(prodButton);

    const infoPanel = document.querySelector('.mt-4.p-4.bg-blue-50.rounded-lg');
    expect(infoPanel).toBeInTheDocument();

    const heading = document.querySelector('h3.font-semibold.text-gray-900');
    expect(heading).toHaveTextContent('Selected Index:');
  });
});
