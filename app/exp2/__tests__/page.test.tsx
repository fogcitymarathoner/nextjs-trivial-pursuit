// app/exp2/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchPage from '../page';

// Mock the SimilarityThresholdSlider component
jest.mock('@/components/similarity-threshold-slider/SimilarityThresholdSlider', () => ({
    SimilarityThresholdSlider: jest.fn(({ onChange, defaultValue, label, step }) => (
        <div data-testid="mock-slider">
            <span data-testid="slider-label">{label}</span>
            <span data-testid="slider-default">{defaultValue}</span>
            <span data-testid="slider-step">{step}</span>
            <input
                type="range"
                min="0"
                max="1"
                step={step}
                defaultValue={defaultValue || 0.5}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                data-testid="slider-input"
            />
        </div>
    )),
}));

describe('SearchPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the page title correctly', () => {
            render(<SearchPage />);

            // Use getAllByText and check the first one (the h1)
            const titles = screen.getAllByText('Similarity Threshold');
            expect(titles[0]).toBeInTheDocument();
            expect(titles[0].tagName).toBe('H1');
        });

        it('should render the page description correctly', () => {
            render(<SearchPage />);

            expect(screen.getByText('Tune the minimum score required for document matches.')).toBeInTheDocument();
        });

        it('should render the SimilarityThresholdSlider component', () => {
            render(<SearchPage />);

            expect(screen.getByTestId('mock-slider')).toBeInTheDocument();
        });

        it('should render the current threshold display', () => {
            render(<SearchPage />);

            expect(screen.getByText(/Current threshold:/)).toBeInTheDocument();
        });

        it('should render the match results description', () => {
            render(<SearchPage />);

            expect(screen.getByText(/Will match results with similarity >=/)).toBeInTheDocument();
        });

        it('should render the default threshold note', () => {
            render(<SearchPage />);

            expect(screen.getByText(/Default: 0.5/)).toBeInTheDocument();
        });
    });

    describe('Layout and styling', () => {
        it('should have main element with app-page class', () => {
            const { container } = render(<SearchPage />);
            const mainElement = container.querySelector('main.app-page');
            expect(mainElement).toBeInTheDocument();
        });

        it('should have container div with app-container class', () => {
            const { container } = render(<SearchPage />);
            const containerDiv = container.querySelector('.app-container');
            expect(containerDiv).toBeInTheDocument();
        });

        it('should have header with page-heading class', () => {
            const { container } = render(<SearchPage />);
            const header = container.querySelector('header.page-heading');
            expect(header).toBeInTheDocument();
        });

        it('should have section with correct surface classes', () => {
            const { container } = render(<SearchPage />);
            const section = container.querySelector('section.surface-panel.surface-panel-spacious.surface-panel-compact.content-stack');
            expect(section).toBeInTheDocument();
        });

        it('should have page title with correct class', () => {
            const { container } = render(<SearchPage />);
            const title = container.querySelector('h1.page-title');
            expect(title).toBeInTheDocument();
            expect(title).toHaveTextContent('Similarity Threshold');
        });

        it('should have page description with correct class', () => {
            const { container } = render(<SearchPage />);
            const description = container.querySelector('p.page-description');
            expect(description).toBeInTheDocument();
        });
    });

    describe('State management', () => {
        it('should initialize threshold state to 0.5', () => {
            render(<SearchPage />);

            // Check that the threshold display shows 0.5
            expect(screen.getByText('Current threshold: 0.5')).toBeInTheDocument();
            expect(screen.getByText('Will match results with similarity >= 0.5')).toBeInTheDocument();
        });

        it('should update threshold when slider changes', async () => {
            render(<SearchPage />);

            const slider = screen.getByTestId('slider-input');

            // Change the slider value
            fireEvent.change(slider, { target: { value: '0.75' } });

            // Wait for the state to update
            await waitFor(() => {
                expect(screen.getByText('Current threshold: 0.75')).toBeInTheDocument();
                expect(screen.getByText('Will match results with similarity >= 0.75')).toBeInTheDocument();
            });
        });

        it('should update threshold to different values', async () => {
            render(<SearchPage />);

            const slider = screen.getByTestId('slider-input');

            // Test multiple values
            const values = [0.25, 0.5, 0.75, 0.9, 1.0];

            for (const value of values) {
                fireEvent.change(slider, { target: { value: String(value) } });

                await waitFor(() => {
                    expect(screen.getByText(`Current threshold: ${value}`)).toBeInTheDocument();
                    expect(screen.getByText(`Will match results with similarity >= ${value}`)).toBeInTheDocument();
                });
            }
        });

        it('should handle step value of 0.01 correctly', async () => {
            render(<SearchPage />);

            const slider = screen.getByTestId('slider-input');

            // Test with step value
            fireEvent.change(slider, { target: { value: '0.51' } });

            await waitFor(() => {
                expect(screen.getByText('Current threshold: 0.51')).toBeInTheDocument();
            });
        });
    });

    describe('SimilarityThresholdSlider props', () => {
        it('should pass correct props to SimilarityThresholdSlider', () => {
            const { SimilarityThresholdSlider } = require('@/components/similarity-threshold-slider/SimilarityThresholdSlider');
            render(<SearchPage />);

            // Check that the component was called with correct props
            // The second argument is undefined (no ref being passed)
            expect(SimilarityThresholdSlider).toHaveBeenCalledWith(
                expect.objectContaining({
                    defaultValue: 0.5,
                    label: 'Similarity Threshold',
                    step: 0.01,
                }),
                undefined
            );
        });

        it('should pass onChange handler to SimilarityThresholdSlider', () => {
            const { SimilarityThresholdSlider } = require('@/components/similarity-threshold-slider/SimilarityThresholdSlider');
            render(<SearchPage />);

            // Check that onChange is a function
            const call = SimilarityThresholdSlider.mock.calls[0][0];
            expect(call.onChange).toBeInstanceOf(Function);
        });

        it('should display the label passed to SimilarityThresholdSlider', () => {
            render(<SearchPage />);

            expect(screen.getByTestId('slider-label')).toHaveTextContent('Similarity Threshold');
        });

        it('should display the step value passed to SimilarityThresholdSlider', () => {
            render(<SearchPage />);

            expect(screen.getByTestId('slider-step')).toHaveTextContent('0.01');
        });

        it('should display the default value passed to SimilarityThresholdSlider', () => {
            render(<SearchPage />);

            expect(screen.getByTestId('slider-default')).toHaveTextContent('0.5');
        });
    });

    describe('Accessibility', () => {
        it('should have appropriate heading hierarchy', () => {
            render(<SearchPage />);

            const headings = screen.getAllByRole('heading', { level: 1 });
            expect(headings).toHaveLength(1);
            expect(headings[0]).toHaveTextContent('Similarity Threshold');
        });

        it('should have appropriate main landmark', () => {
            render(<SearchPage />);

            const main = screen.getByRole('main');
            expect(main).toBeInTheDocument();
            expect(main).toHaveClass('app-page');
        });
    });

    describe('Content structure', () => {
        it('should display the current threshold in the correct format', () => {
            render(<SearchPage />);

            const thresholdText = screen.getByText(/Current threshold:/);
            expect(thresholdText).toBeInTheDocument();
            expect(thresholdText).toHaveClass('body-copy');
        });

        it('should display the match results in the correct format', () => {
            render(<SearchPage />);

            const matchText = screen.getByText(/Will match results with similarity >=/);
            expect(matchText).toBeInTheDocument();
            expect(matchText).toHaveClass('body-copy');
        });

        it('should display the default note in the correct format', () => {
            render(<SearchPage />);

            const defaultText = screen.getByText(/Default: 0.5/);
            expect(defaultText).toBeInTheDocument();
            expect(defaultText).toHaveClass('body-copy-muted');
        });

        it('should have content stack class on the section', () => {
            const { container } = render(<SearchPage />);
            const section = container.querySelector('.content-stack');
            expect(section).toBeInTheDocument();
        });

        it('should have surface-inner-item class on the info div', () => {
            const { container } = render(<SearchPage />);
            const infoDiv = container.querySelector('.surface-inner-item');
            expect(infoDiv).toBeInTheDocument();
        });
    });

    describe('Snapshot', () => {
        it('should match snapshot', () => {
            const { container } = render(<SearchPage />);
            expect(container).toMatchSnapshot();
        });
    });
});