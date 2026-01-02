/**
 * Component Tests: Create Rule Form
 *
 * Tests for the rule creation form component
 * Total: 15 tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CreateRulePage from '@/app/dashboard/rules/create/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

// Mock fetch
global.fetch = jest.fn();

describe('CreateRuleForm Component', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should render the form with all sections', () => {
    render(<CreateRulePage />);

    expect(screen.getByText('Create Automation Rule')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should require rule name', () => {
    render(<CreateRulePage />);

    const nameInput = screen.getByPlaceholderText(/e\.g\., weekly allowance/i);
    // Check that HTML5 required attribute is set
    expect(nameInput).toHaveAttribute('required');
  });

  it('should require trigger type selection', () => {
    render(<CreateRulePage />);

    const triggerSelects = screen.getAllByRole('combobox');
    // Check that first select (trigger type) has required attribute
    expect(triggerSelects[0]).toHaveAttribute('required');
  });

  it('should have add action button available', () => {
    render(<CreateRulePage />);

    // Verify "Add Action" button exists for building action list
    const addActionButton = screen.getByRole('button', { name: /add action/i });
    expect(addActionButton).toBeInTheDocument();
    expect(addActionButton).not.toBeDisabled();
  });

  it('should add and remove actions', () => {
    render(<CreateRulePage />);

    // Initially no actions
    expect(screen.getByText(/no actions added yet/i)).toBeInTheDocument();

    // Add action
    const addActionButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addActionButton);

    // Should show action form
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.queryByText(/no actions added yet/i)).not.toBeInTheDocument();

    // Add another action
    fireEvent.click(addActionButton);
    expect(screen.getByText('Action 2')).toBeInTheDocument();

    // Remove first action
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    // Should only have one action left (renumbered to Action 1)
    expect(screen.queryByText('Action 1')).toBeInTheDocument();
    expect(screen.queryByText('Action 2')).not.toBeInTheDocument();
  });

  it('should limit actions to 5', () => {
    render(<CreateRulePage />);

    const addActionButton = screen.getByRole('button', { name: /add action/i });

    // Add 5 actions
    for (let i = 0; i < 5; i++) {
      fireEvent.click(addActionButton);
    }

    // Button should be disabled
    expect(addActionButton).toBeDisabled();
  });

  it('should show trigger configuration fields for chore_streak', () => {
    render(<CreateRulePage />);

    const triggerSelect = screen.getByRole('combobox', { name: /trigger type/i });
    fireEvent.change(triggerSelect, { target: { value: 'chore_streak' } });

    expect(screen.getByText('Trigger Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText(/number of days/i)).toBeInTheDocument();
  });

  it('should show trigger configuration fields for screentime_low', () => {
    render(<CreateRulePage />);

    const triggerSelect = screen.getByRole('combobox', { name: /trigger type/i });
    fireEvent.change(triggerSelect, { target: { value: 'screentime_low' } });

    expect(screen.getByLabelText(/threshold \(minutes\)/i)).toBeInTheDocument();
  });

  it('should show trigger configuration fields for time_based', () => {
    render(<CreateRulePage />);

    const triggerSelect = screen.getByRole('combobox', { name: /trigger type/i });
    fireEvent.change(triggerSelect, { target: { value: 'time_based' } });

    expect(screen.getByLabelText(/cron expression/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(/format: minute hour day month dayofweek/i)).toBeInTheDocument();
  });

  it('should show action configuration fields for award_credits', () => {
    render(<CreateRulePage />);

    const addActionButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addActionButton);

    const actionSelect = screen.getByRole('combobox', { name: /action type/i });
    fireEvent.change(actionSelect, { target: { value: 'award_credits' } });

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason \(optional\)/i)).toBeInTheDocument();
  });

  it('should show action configuration fields for send_notification', () => {
    render(<CreateRulePage />);

    const addActionButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addActionButton);

    const actionSelect = screen.getByRole('combobox', { name: /action type/i });
    fireEvent.change(actionSelect, { target: { value: 'send_notification' } });

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rule: { id: 'new-rule' } }),
    });

    render(<CreateRulePage />);

    // Fill in name
    const nameInput = screen.getByPlaceholderText(/e\.g\., weekly allowance/i);
    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });

    // Fill in description
    const descInput = screen.getByPlaceholderText(/e\.g\., award weekly allowance/i);
    fireEvent.change(descInput, { target: { value: 'Test description' } });

    // Select trigger
    const triggerSelect = screen.getByLabelText(/trigger type/i) as HTMLSelectElement;
    fireEvent.change(triggerSelect, { target: { value: 'chore_streak' } });

    // Configure trigger
    const daysInput = screen.getByPlaceholderText(/e\.g\., 7/i);
    fireEvent.change(daysInput, { target: { value: '7' } });

    // Add action
    const addActionButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addActionButton);

    // Select action type - wait for it to appear after adding action
    await waitFor(() => {
      expect(screen.getByLabelText(/action type/i)).toBeInTheDocument();
    });
    const actionSelect = screen.getByLabelText(/action type/i) as HTMLSelectElement;
    fireEvent.change(actionSelect, { target: { value: 'award_credits' } });

    // Configure action
    const amountInput = screen.getByPlaceholderText(/e\.g\., 10/i);
    fireEvent.change(amountInput, { target: { value: '10' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /create rule/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/rules',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test Rule'),
        })
      );
    });

    // Should redirect to rules page
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/rules');
    });
  });

  it('should display error message on submission failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid trigger configuration' }),
    });

    render(<CreateRulePage />);

    // Fill in minimum required fields
    const nameInput = screen.getByPlaceholderText(/e\.g\., weekly allowance/i);
    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });

    const triggerSelect = screen.getByRole('combobox', { name: /trigger type/i });
    fireEvent.change(triggerSelect, { target: { value: 'chore_completed' } });

    const addActionButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addActionButton);

    const actionSelect = screen.getByRole('combobox', { name: /action type/i });
    fireEvent.change(actionSelect, { target: { value: 'award_credits' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /create rule/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid trigger configuration/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }),
            100
          )
        )
    );

    render(<CreateRulePage />);

    // Fill in minimum required fields
    const nameInput = screen.getByPlaceholderText(/e\.g\., weekly allowance/i);
    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });

    const triggerSelect = screen.getByRole('combobox', { name: /trigger type/i });
    fireEvent.change(triggerSelect, { target: { value: 'chore_completed' } });

    const addActionButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addActionButton);

    const actionSelect = screen.getByRole('combobox', { name: /action type/i });
    fireEvent.change(actionSelect, { target: { value: 'award_credits' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /create rule/i });
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument();
    });
  });

  it('should have cancel button that links back to rules page', () => {
    render(<CreateRulePage />);

    const cancelLink = screen.getByText(/cancel/i);
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink.closest('a')).toHaveAttribute('href', '/dashboard/rules');
  });
});
