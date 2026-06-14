import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { FallbackToGeneralKnowledgeCheckbox } from '../FallbackToGeneralKnowledgeCheckbox';

jest.mock('@heroicons/react/24/outline', () => ({
  InformationCircleIcon: () => <div data-testid="info-icon">InfoIcon</div>,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon">WarningIcon</div>,
}));

describe('FallbackToGeneralKnowledgeCheckbox Snapshots', () => {
  it('matches snapshot in default state', () => {
    const { container } = render(<FallbackToGeneralKnowledgeCheckbox />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when checked', () => {
    const { container } = render(<FallbackToGeneralKnowledgeCheckbox defaultChecked />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot when disabled', () => {
    const { container } = render(<FallbackToGeneralKnowledgeCheckbox disabled />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with custom props', () => {
    const { container } = render(
      <FallbackToGeneralKnowledgeCheckbox
        label="Custom Label"
        description="Custom Description"
        size="lg"
        className="custom-class"
      />,
    );

    expect(container).toMatchSnapshot();
  });
});

describe('FallbackToGeneralKnowledgeCheckbox behavior', () => {
  it('toggles checked state and calls onChange', () => {
    const onChange = jest.fn();

    render(<FallbackToGeneralKnowledgeCheckbox onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('DISABLED')).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('ENABLED')).toBeInTheDocument();
    expect(screen.getByText('General Knowledge Fallback Enabled')).toBeInTheDocument();
  });

  it('syncs checked state when defaultChecked changes', () => {
    const { rerender } = render(<FallbackToGeneralKnowledgeCheckbox defaultChecked={false} />);

    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(<FallbackToGeneralKnowledgeCheckbox defaultChecked />);

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('shows and hides tooltip content on mouse and focus events', () => {
    render(<FallbackToGeneralKnowledgeCheckbox tooltipText="Helpful tooltip text" />);

    const infoButton = screen.getByRole('button', { name: 'More information' });
    expect(screen.queryByText('Helpful tooltip text')).not.toBeInTheDocument();

    fireEvent.mouseEnter(infoButton);
    expect(screen.getByText('Helpful tooltip text')).toBeInTheDocument();

    fireEvent.mouseLeave(infoButton);
    expect(screen.queryByText('Helpful tooltip text')).not.toBeInTheDocument();

    fireEvent.focus(infoButton);
    expect(screen.getByText('Helpful tooltip text')).toBeInTheDocument();

    fireEvent.blur(infoButton);
    expect(screen.queryByText('Helpful tooltip text')).not.toBeInTheDocument();
  });

  it('does not show tooltip or warning controls when disabled', () => {
    render(<FallbackToGeneralKnowledgeCheckbox defaultChecked disabled />);

    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'More information' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
  });

  it('hides optional description and warning when disabled by props', () => {
    render(
      <FallbackToGeneralKnowledgeCheckbox
        defaultChecked
        description=""
        showWarning={false}
      />,
    );

    expect(screen.queryByText('General Knowledge Fallback Enabled')).not.toBeInTheDocument();
    expect(screen.queryByText('When enabled, the system will use general knowledge')).not.toBeInTheDocument();
  });

  it('turns off fallback from the warning disable button', () => {
    render(<FallbackToGeneralKnowledgeCheckbox defaultChecked />);

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByText('DISABLED')).toBeInTheDocument();
    expect(screen.queryByText('General Knowledge Fallback Enabled')).not.toBeInTheDocument();
  });
});
