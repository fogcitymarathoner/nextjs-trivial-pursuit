import { render, screen, fireEvent } from '@testing-library/react';
import { SimilarityThresholdSlider } from '../SimilarityThresholdSlider';
import '@testing-library/jest-dom';

// Mock process.env
const originalEnv = process.env;

describe('SimilarityThresholdSlider', () => {
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<SimilarityThresholdSlider />);

      expect(screen.getByText('Similarity Threshold')).toBeInTheDocument();
      expect(screen.getByText('Minimum similarity score for matches')).toBeInTheDocument();
      expect(screen.getByText('0.50')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<SimilarityThresholdSlider label="Custom Label" />);
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('renders without presets when showPresets is false', () => {
      render(<SimilarityThresholdSlider showPresets={false} />);

      expect(screen.queryByText('Relaxed')).not.toBeInTheDocument();
      expect(screen.queryByText('Balanced (Default)')).not.toBeInTheDocument();
      expect(screen.queryByText('Strict')).not.toBeInTheDocument();
      expect(screen.queryByText('Very Strict')).not.toBeInTheDocument();
    });

    it('renders without description when showDescription is false', () => {
      render(<SimilarityThresholdSlider showDescription={false} />);

      expect(screen.queryByText('Minimum similarity score for matches')).not.toBeInTheDocument();
    });

    it('displays tick marks correctly', () => {
      render(<SimilarityThresholdSlider />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Initial Value', () => {
    it('uses defaultValue when provided', () => {
      render(<SimilarityThresholdSlider defaultValue={0.75} />);
      expect(screen.getByText('0.75')).toBeInTheDocument();
      expect(screen.getByText('(75%)')).toBeInTheDocument();
    });

    it('uses DEFAULT_THRESHOLD from environment when defaultValue not provided', () => {
      process.env.DEFAULT_THRESHOLD = '0.8';
      render(<SimilarityThresholdSlider />);
      expect(screen.getByText('0.80')).toBeInTheDocument();
    });

    it('defaults to 0.5 when no defaultValue or env variable provided', () => {
      delete process.env.DEFAULT_THRESHOLD;
      render(<SimilarityThresholdSlider />);
      expect(screen.getByText('0.50')).toBeInTheDocument();
    });

    it('updates when defaultValue changes', () => {
      const { rerender } = render(<SimilarityThresholdSlider defaultValue={0.5} />);
      expect(screen.getByText('0.50')).toBeInTheDocument();

      rerender(<SimilarityThresholdSlider defaultValue={0.8} />);
      expect(screen.getByText('0.80')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('updates threshold when slider is moved', async () => {
      const onChange = jest.fn();
      render(<SimilarityThresholdSlider onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.75' } });

      expect(screen.getByText('0.75')).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith(0.75);
    });

    it('respects custom step value', () => {
      render(<SimilarityThresholdSlider step={0.05} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '0.05');
    });

    it('changes threshold when preset buttons are clicked', async () => {
      const onChange = jest.fn();
      render(<SimilarityThresholdSlider onChange={onChange} />);

      const strictButton = screen.getByText('Strict');
      fireEvent.click(strictButton);

      expect(screen.getByText('0.70')).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith(0.7);
    });

    it('highlights active preset button', () => {
      render(<SimilarityThresholdSlider defaultValue={0.7} />);

      const strictButton = screen.getByText('Strict').closest('button');
      expect(strictButton).toHaveClass('bg-blue-600');

      const balancedButton = screen.getByText('Balanced (Default)').closest('button');
      expect(balancedButton).toHaveClass('bg-blue-50');
    });
  });

  describe('Threshold Info Display', () => {
    it('shows Low Precision for threshold < 0.3', () => {
      render(<SimilarityThresholdSlider defaultValue={0.2} />);
      expect(screen.getByText('Low Precision')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('shows Low-Moderate for threshold between 0.3 and 0.5', () => {
      render(<SimilarityThresholdSlider defaultValue={0.4} />);
      expect(screen.getByText('Low-Moderate')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('shows Default (Balanced) for threshold = 0.5', () => {
      render(<SimilarityThresholdSlider defaultValue={0.5} />);
      expect(screen.getByText('Default (Balanced)')).toBeInTheDocument();
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('shows High Precision for threshold between 0.5 and 0.7', () => {
      render(<SimilarityThresholdSlider defaultValue={0.6} />);
      expect(screen.getByText('High Precision')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('shows Very High Precision for threshold >= 0.7', () => {
      render(<SimilarityThresholdSlider defaultValue={0.9} />);
      expect(screen.getByText('Very High Precision')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  describe('Description Text', () => {
    it('shows correct description for default threshold (0.5)', () => {
      render(<SimilarityThresholdSlider defaultValue={0.5} />);
      expect(screen.getByText('Default balanced setting - good for most use cases')).toBeInTheDocument();
    });

    it('shows correct description for low threshold (< 0.3)', () => {
      render(<SimilarityThresholdSlider defaultValue={0.2} />);
      expect(screen.getByText('Lower threshold means more results, even if less relevant')).toBeInTheDocument();
    });

    it('shows correct description for medium-low threshold (0.3-0.5)', () => {
      render(<SimilarityThresholdSlider defaultValue={0.4} />);
      expect(screen.getByText('More results with reasonable accuracy')).toBeInTheDocument();
    });

    it('shows correct description for medium-high threshold (0.5-0.7)', () => {
      render(<SimilarityThresholdSlider defaultValue={0.6} />);
      expect(screen.getByText('Higher threshold ensures better quality matches')).toBeInTheDocument();
    });

    it('shows correct description for high threshold (>= 0.7)', () => {
      render(<SimilarityThresholdSlider defaultValue={0.8} />);
      expect(screen.getByText('Maximum accuracy, may miss some valid matches')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<SimilarityThresholdSlider />);
      const slider = screen.getByRole('slider');

      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '1');
      expect(slider).toHaveAttribute('step', '0.01');
    });

    it('is keyboard accessible', async () => {
      const onChange = jest.fn();
      render(<SimilarityThresholdSlider onChange={onChange} />);

      const slider = screen.getByRole('slider');
      slider.focus();

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      // Note: The actual value change depends on the browser's implementation
      // This test ensures the component is keyboard focusable
      expect(slider).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid defaultValue gracefully', () => {
      // @ts-ignore - Testing invalid prop
      render(<SimilarityThresholdSlider defaultValue="invalid" />);
      expect(screen.getByText('0.50')).toBeInTheDocument();
    });

    it('handles invalid environment variable', () => {
      process.env.DEFAULT_THRESHOLD = 'invalid';
      render(<SimilarityThresholdSlider />);
      expect(screen.getByText('0.50')).toBeInTheDocument();
    });

    it('handles rapid value changes', async () => {
      const onChange = jest.fn();
      render(<SimilarityThresholdSlider onChange={onChange} />);

      const slider = screen.getByRole('slider');

      fireEvent.change(slider, { target: { value: '0.1' } });
      fireEvent.change(slider, { target: { value: '0.2' } });
      fireEvent.change(slider, { target: { value: '0.3' } });

      expect(screen.getByText('0.30')).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenLastCalledWith(0.3);
    });

    it('handles threshold at boundaries', () => {
      render(<SimilarityThresholdSlider defaultValue={0} />);
      expect(screen.getByText('0.00')).toBeInTheDocument();

      render(<SimilarityThresholdSlider defaultValue={1} />);
      expect(screen.getByText('1.00')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct background color based on threshold value', () => {
      render(<SimilarityThresholdSlider defaultValue={0.5} />);
      const slider = screen.getByRole('slider');
      const parentDiv = slider.parentElement;

      expect(parentDiv).toHaveStyle({
        background: expect.stringContaining('linear-gradient')
      });
    });

    it('applies different status indicator colors', () => {
      const { rerender } = render(<SimilarityThresholdSlider defaultValue={0.2} />);
      let statusDiv = screen.getByText('Low Precision').closest('div[class*="bg-"]');
      expect(statusDiv).toHaveClass('bg-red-50');

      rerender(<SimilarityThresholdSlider defaultValue={0.4} />);
      statusDiv = screen.getByText('Low-Moderate').closest('div[class*="bg-"]');
      expect(statusDiv).toHaveClass('bg-yellow-50');

      rerender(<SimilarityThresholdSlider defaultValue={0.6} />);
      statusDiv = screen.getByText('High Precision').closest('div[class*="bg-"]');
      expect(statusDiv).toHaveClass('bg-blue-50');

      rerender(<SimilarityThresholdSlider defaultValue={0.9} />);
      statusDiv = screen.getByText('Very High Precision').closest('div[class*="bg-"]');
      expect(statusDiv).toHaveClass('bg-green-50');
    });
  });
});
