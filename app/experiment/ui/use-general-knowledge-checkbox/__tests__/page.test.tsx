// app/exp3/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../page';

// Mock the FallbackToGeneralKnowledgeCheckbox component
jest.mock('@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox', () => ({
    FallbackToGeneralKnowledgeCheckbox: jest.fn(({
                                                     onChange,
                                                     defaultChecked,
                                                     label,
                                                     description,
                                                     tooltipText,
                                                     warningTitle,
                                                     warningMessage,
                                                     size,
                                                     showTooltip,
                                                     showWarning
                                                 }) => (
        <div data-testid="mock-checkbox">
            <span data-testid="checkbox-label">{label}</span>
            <span data-testid="checkbox-description">{description}</span>
            <span data-testid="checkbox-tooltip">{tooltipText}</span>
            <span data-testid="checkbox-warning-title">{warningTitle}</span>
            <span data-testid="checkbox-warning-message">{warningMessage}</span>
            <span data-testid="checkbox-size">{size}</span>
            <span data-testid="checkbox-show-tooltip">{String(showTooltip)}</span>
            <span data-testid="checkbox-show-warning">{String(showWarning)}</span>
            <input
                type="checkbox"
                defaultChecked={defaultChecked}
                onChange={(e) => onChange(e.target.checked)}
                data-testid="checkbox-input"
            />
        </div>
    )),
}));

describe('SettingsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the page title correctly', () => {
            render(<SettingsPage />);
            expect(screen.getByText('Search Settings')).toBeInTheDocument();
        });

        it('should render the page description correctly', () => {
            render(<SettingsPage />);
            expect(screen.getByText('Configure how your AI assistant handles document search.')).toBeInTheDocument();
        });

        it('should render the FallbackToGeneralKnowledgeCheckbox component', () => {
            render(<SettingsPage />);
            expect(screen.getByTestId('mock-checkbox')).toBeInTheDocument();
        });

        it('should not render the behavior section initially', () => {
            render(<SettingsPage />);
            expect(screen.queryByText('Current Behavior:')).not.toBeInTheDocument();
            expect(screen.queryByText('First searches your Pinecone index for relevant documents')).not.toBeInTheDocument();
        });

        it('should render the behavior section when checkbox is checked', async () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(screen.getByText('Current Behavior:')).toBeInTheDocument();
                expect(screen.getByText('First searches your Pinecone index for relevant documents')).toBeInTheDocument();
                expect(screen.getByText('If no results above threshold, falls back to GPT general knowledge')).toBeInTheDocument();
                expect(screen.getByText('Responses may not reference your specific documents')).toBeInTheDocument();
            });
        });
    });

    describe('Layout and styling', () => {
        it('should have main element with app-page class', () => {
            const { container } = render(<SettingsPage />);
            const mainElement = container.querySelector('main.app-page');
            expect(mainElement).toBeInTheDocument();
        });

        it('should have container div with app-container class', () => {
            const { container } = render(<SettingsPage />);
            const containerDiv = container.querySelector('.app-container');
            expect(containerDiv).toBeInTheDocument();
        });

        it('should have header with page-heading class', () => {
            const { container } = render(<SettingsPage />);
            const header = container.querySelector('header.page-heading');
            expect(header).toBeInTheDocument();
        });

        it('should have section with correct surface classes', () => {
            const { container } = render(<SettingsPage />);
            const section = container.querySelector('section.surface-panel.surface-panel-spacious.surface-panel-compact.content-stack');
            expect(section).toBeInTheDocument();
        });

        it('should have page title with correct class', () => {
            const { container } = render(<SettingsPage />);
            const title = container.querySelector('h1.page-title');
            expect(title).toBeInTheDocument();
            expect(title).toHaveTextContent('Search Settings');
        });

        it('should have page description with correct class', () => {
            const { container } = render(<SettingsPage />);
            const description = container.querySelector('p.page-description');
            expect(description).toBeInTheDocument();
        });
    });

    describe('State management', () => {
        it('should initialize useFallback state to false', () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            expect(checkbox).not.toBeChecked();
        });

        it('should update useFallback state when checkbox is checked', async () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            expect(checkbox).not.toBeChecked();

            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(checkbox).toBeChecked();
            });
        });

        it('should show behavior section when checkbox is checked', async () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                const behaviorSection = screen.getByText('Current Behavior:');
                expect(behaviorSection).toBeInTheDocument();
                expect(behaviorSection.tagName).toBe('H3');
            });
        });

        it('should hide behavior section when checkbox is unchecked', async () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');

            // Check it
            fireEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('Current Behavior:')).toBeInTheDocument();
            });

            // Uncheck it
            fireEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.queryByText('Current Behavior:')).not.toBeInTheDocument();
            });
        });

        it('should have behavior section with correct classes', async () => {
            const { container } = render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                const behaviorDiv = container.querySelector('.surface-inner-item');
                expect(behaviorDiv).toBeInTheDocument();
            });
        });

        it('should have behavior section with content-list class', async () => {
            const { container } = render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                const list = container.querySelector('ul.content-list');
                expect(list).toBeInTheDocument();
                expect(list?.children).toHaveLength(3);
            });
        });
    });

    describe('FallbackToGeneralKnowledgeCheckbox props', () => {
        it('should pass correct props to FallbackToGeneralKnowledgeCheckbox', () => {
            const { FallbackToGeneralKnowledgeCheckbox } = require('@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox');
            render(<SettingsPage />);

            expect(FallbackToGeneralKnowledgeCheckbox).toHaveBeenCalledWith(
                expect.objectContaining({
                    defaultChecked: false,
                    label: 'Allow AI to use general knowledge',
                    description: 'When document search returns no results, the AI will answer using its training data',
                    tooltipText: 'This is useful for general questions but may not reflect your specific document content. Use with caution for factual queries.',
                    warningTitle: 'General Knowledge Mode Active',
                    warningMessage: 'The AI will now provide answers based on its general training data when specific information isn\'t found in your documents. This may lead to responses that are not accurate for your specific use case.',
                    size: 'lg',
                    showTooltip: true,
                    showWarning: true,
                }),
                undefined
            );
        });

        it('should pass onChange handler to FallbackToGeneralKnowledgeCheckbox', () => {
            const { FallbackToGeneralKnowledgeCheckbox } = require('@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox');
            render(<SettingsPage />);

            const call = FallbackToGeneralKnowledgeCheckbox.mock.calls[0][0];
            expect(call.onChange).toBeInstanceOf(Function);
        });

        it('should display the label passed to the checkbox', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-label')).toHaveTextContent('Allow AI to use general knowledge');
        });

        it('should display the description passed to the checkbox', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-description')).toHaveTextContent(
                'When document search returns no results, the AI will answer using its training data'
            );
        });

        it('should display the tooltip text passed to the checkbox', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-tooltip')).toHaveTextContent(
                'This is useful for general questions but may not reflect your specific document content. Use with caution for factual queries.'
            );
        });

        it('should display the warning title passed to the checkbox', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-warning-title')).toHaveTextContent('General Knowledge Mode Active');
        });

        it('should display the warning message passed to the checkbox', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-warning-message')).toHaveTextContent(
                'The AI will now provide answers based on its general training data when specific information isn\'t found in your documents. This may lead to responses that are not accurate for your specific use case.'
            );
        });

        it('should pass size prop as "lg"', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-size')).toHaveTextContent('lg');
        });

        it('should pass showTooltip as true', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-show-tooltip')).toHaveTextContent('true');
        });

        it('should pass showWarning as true', () => {
            render(<SettingsPage />);

            expect(screen.getByTestId('checkbox-show-warning')).toHaveTextContent('true');
        });

        it('should pass defaultChecked as false', () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            expect(checkbox).not.toBeChecked();
        });
    });

    describe('Accessibility', () => {
        it('should have appropriate heading hierarchy', () => {
            render(<SettingsPage />);

            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
            expect(heading).toHaveTextContent('Search Settings');
        });

        it('should have appropriate main landmark', () => {
            render(<SettingsPage />);

            const main = screen.getByRole('main');
            expect(main).toBeInTheDocument();
            expect(main).toHaveClass('app-page');
        });

        it('should have checkbox with accessible label', () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            expect(checkbox).toHaveAttribute('type', 'checkbox');
        });
    });

    describe('Behavior section content', () => {
        it('should display all three behavior items when checked', async () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(screen.getByText('First searches your Pinecone index for relevant documents')).toBeInTheDocument();
                expect(screen.getByText('If no results above threshold, falls back to GPT general knowledge')).toBeInTheDocument();
                expect(screen.getByText('Responses may not reference your specific documents')).toBeInTheDocument();
            });
        });

        it('should have h3 with section-label class when checked', async () => {
            render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                const heading = screen.getByText('Current Behavior:');
                expect(heading).toHaveClass('section-label');
            });
        });
    });

    describe('Snapshot', () => {
        it('should match snapshot when unchecked', () => {
            const { container } = render(<SettingsPage />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot when checked', async () => {
            const { container } = render(<SettingsPage />);

            const checkbox = screen.getByTestId('checkbox-input');
            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(container).toMatchSnapshot();
            });
        });
    });
});