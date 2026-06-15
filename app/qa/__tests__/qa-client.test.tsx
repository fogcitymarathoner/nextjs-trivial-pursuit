import '@testing-library/jest-dom';
import type { ChangeEvent } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QaClient } from '../qa-client';
import type { PineconeIndexOption } from '@/config/pinecone/types';

// Mock child components
jest.mock('@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox', () => ({
  FallbackToGeneralKnowledgeCheckbox: ({ defaultChecked, onChange }: any) => (
    <div data-testid="fallback-checkbox">
    <input
      type="checkbox"
  defaultChecked={defaultChecked}
  onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
data-testid="fallback-input"
  />
  <label>Fallback to General Knowledge</label>
</div>
),
}));

jest.mock('@/components/pinecone/PineconeDropdown', () => ({
  PineconeDropdown: ({ indexes, onSelect, defaultValue }: any) => (
    <div data-testid="pinecone-dropdown">
    <select
      defaultValue={defaultValue}
  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
  const selected = indexes.find((i: any) => i.label === e.target.value);
  if (selected) onSelect(selected);
}}
data-testid="index-select"
  >
  {indexes.map((index: any) => (
      <option key={index.indexName} value={index.label}>
      {index.label}
      </option>
))}
</select>
</div>
),
}));

jest.mock('@/components/similarity-threshold-slider/SimilarityThresholdSlider', () => ({
  SimilarityThresholdSlider: ({ defaultValue, onChange, label }: any) => (
    <div data-testid="threshold-slider">
    <input
      type="range"
  min="0"
  max="1"
  step="0.01"
  defaultValue={defaultValue}
  onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
data-testid="threshold-input"
  />
  <span>{label}</span>
  </div>
),
}));

// Mock fetch
global.fetch = jest.fn();

describe('QaClient', () => {
  const mockIndexes: PineconeIndexOption[] = [
    {
      label: 'Production Index',
      indexName: 'prod-index',
      description: 'Production environment',
    },
    {
      label: 'Development Index',
      indexName: 'dev-index',
      description: 'Development environment',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<QaClient indexes={mockIndexes} />);

      expect(screen.getByText('Q&A')).toBeInTheDocument();
      expect(screen.getByText('Ask')).toBeInTheDocument();
    });

    it('renders the question textarea', () => {
      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      expect(textarea).toBeInTheDocument();
    });

    it('renders the Ask button', () => {
      render(<QaClient indexes={mockIndexes} />);

      const askButton = screen.getByText('Ask');
      expect(askButton).toBeInTheDocument();
    });

    it('renders the Pinecone dropdown', () => {
      render(<QaClient indexes={mockIndexes} />);

      expect(screen.getByTestId('pinecone-dropdown')).toBeInTheDocument();
    });

    it('renders the similarity threshold slider', () => {
      render(<QaClient indexes={mockIndexes} />);

      expect(screen.getByTestId('threshold-slider')).toBeInTheDocument();
      expect(screen.getByText('Similarity Threshold')).toBeInTheDocument();
    });

    it('renders the fallback checkbox', () => {
      render(<QaClient indexes={mockIndexes} />);

      expect(screen.getByTestId('fallback-checkbox')).toBeInTheDocument();
    });

    it('disables Ask button when no indexes are provided', () => {
      render(<QaClient indexes={[]} />);

      const askButton = screen.getByText('Ask');
      expect(askButton).toBeDisabled();
    });

    it('enables Ask button when indexes are provided', () => {
      render(<QaClient indexes={mockIndexes} />);

      const askButton = screen.getByText('Ask');
      expect(askButton).not.toBeDisabled();
    });
  });

  describe('Initial State', () => {
    it('sets first index as default selected', () => {
      render(<QaClient indexes={mockIndexes} />);

      const select = screen.getByTestId('index-select') as HTMLSelectElement;
      expect(select.value).toBe(mockIndexes[0].label);
    });

    it('sets threshold to 0.5 by default', () => {
      render(<QaClient indexes={mockIndexes} />);

      const thresholdInput = screen.getByTestId('threshold-input') as HTMLInputElement;
      expect(thresholdInput.value).toBe('0.5');
    });

    it('sets fallback to general knowledge to true by default', () => {
      render(<QaClient indexes={mockIndexes} />);

      const fallbackInput = screen.getByTestId('fallback-input') as HTMLInputElement;
      expect(fallbackInput.checked).toBe(true);
    });

    it('has empty question by default', () => {
      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });
  });

  describe('User Interactions', () => {
    it('updates question state when typing', () => {
      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'What is the capital of France?' } });

      expect(textarea).toHaveValue('What is the capital of France?');
    });

    it('updates threshold when slider changes', () => {
      render(<QaClient indexes={mockIndexes} />);

      const thresholdInput = screen.getByTestId('threshold-input');
      fireEvent.change(thresholdInput, { target: { value: '0.8' } });

      expect(thresholdInput).toHaveValue('0.8');
    });

    it('updates fallback checkbox when clicked', () => {
      render(<QaClient indexes={mockIndexes} />);

      const fallbackInput = screen.getByTestId('fallback-input') as HTMLInputElement;
      fireEvent.click(fallbackInput);

      expect(fallbackInput.checked).toBe(false);
    });

    it('updates selected index when dropdown changes', () => {
      render(<QaClient indexes={mockIndexes} />);

      const select = screen.getByTestId('index-select');
      fireEvent.change(select, { target: { value: 'Development Index' } });

      expect(select).toHaveValue('Development Index');
    });
  });

  describe('API Calls', () => {
    const mockSuccessfulResponse = {
      answer: 'The capital of France is Paris.',
      matches: [
        {
          id: 'doc1',
          score: 0.95,
          metadata: {
            text: 'Paris is the capital of France.',
            source: 'geography-books',
            page: 42,
          },
        },
      ],
      hasContext: true,
      needsFallbackDecision: false,
      message: 'Success',
    };

    it('sends question to API when form is submitted', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'What is the capital of France?' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('/api/qa/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'What is the capital of France?',
            similarityThreshold: 0.5,
            fallbackToGeneralKnowledge: true,
            pineconeIndexLabel: mockIndexes[0].label,
          }),
        });
      });
    });

    it('displays loading state while fetching', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(
          () => resolve({
            ok: true,
            json: async () => mockSuccessfulResponse,
          }),
          100,
        ))
      );

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      expect(screen.getByText('Asking...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Ask')).toBeInTheDocument();
      });
    });

    it('displays answer when API returns successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'What is the capital of France?' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('The capital of France is Paris.')).toBeInTheDocument();
      });
    });

    it('displays matches when API returns results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessfulResponse,
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('Pinecone Results (1)')).toBeInTheDocument();
      });
    });

    it('displays error message when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error' }),
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('shows error when question is empty', async () => {
      render(<QaClient indexes={mockIndexes} />);

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      expect(screen.getByText('Enter a question first.')).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Decision', () => {
    const needsFallbackResponse = {
      answer: null,
      matches: [],
      hasContext: false,
      needsFallbackDecision: true,
      message: 'No results found',
    };

    it('shows retry button when needsFallbackDecision is true', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => needsFallbackResponse,
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('Retry With General Knowledge')).toBeInTheDocument();
        expect(screen.getByText('No Pinecone results were found and general knowledge is off.')).toBeInTheDocument();
      });
    });

    it('retries with fallback override when retry button clicked', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => needsFallbackResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            answer: 'Answer with fallback',
            matches: [],
            hasContext: false,
            needsFallbackDecision: false,
            message: 'Success',
          }),
        });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('Retry With General Knowledge')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry With General Knowledge');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenLastCalledWith('/api/qa/answer', expect.objectContaining({
          body: expect.stringContaining('"fallbackToGeneralKnowledge":true'),
        }));
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('handles API response without error message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to answer the question')).toBeInTheDocument();
      });
    });
  });

  describe('Matches Display', () => {
    const responseWithMatches = {
      answer: 'Answer text',
      matches: [
        {
          id: 'match1',
          score: 0.95,
          metadata: {
            text: 'Match text content',
            source: 'source.pdf',
            page: 5,
          },
        },
        {
          id: 'match2',
          score: 0.85,
          metadata: {
            text: 'Second match content',
            source: 'another.pdf',
            page: 10,
          },
        },
      ],
      hasContext: true,
      needsFallbackDecision: false,
      message: 'Success',
    };

    it('displays match details correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithMatches,
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText(/ID:\s*match1/)).toBeInTheDocument();
        expect(screen.getByText(/Score:\s*0\.950/)).toBeInTheDocument();
        expect(screen.getByText(/Source:\s*source\.pdf/)).toBeInTheDocument();
        expect(screen.getByText('Match text content')).toBeInTheDocument();
      });
    });

    it('shows "No matches returned" when matches array is empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...responseWithMatches,
          matches: [],
        }),
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      const askButton = screen.getByText('Ask');
      fireEvent.click(askButton);

      await waitFor(() => {
        expect(screen.getByText('No matches returned.')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form submission on Enter key', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'Submitted answer',
          matches: [],
          hasContext: false,
          needsFallbackDecision: false,
          message: 'Success',
        }),
      });

      render(<QaClient indexes={mockIndexes} />);

      const textarea = screen.getByPlaceholderText('What did Calvin Coolidge say about the tax policy?');
      fireEvent.change(textarea, { target: { value: 'Test question' } });

      fireEvent.submit(textarea.closest('form')!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('has proper labels for form elements', () => {
      render(<QaClient indexes={mockIndexes} />);

      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Pinecone Index')).toBeInTheDocument();
    });
  });
});
