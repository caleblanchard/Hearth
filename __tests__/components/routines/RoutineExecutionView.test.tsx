import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoutineExecutionView from '@/components/routines/RoutineExecutionView';

// Mock fetch
global.fetch = jest.fn();

describe('RoutineExecutionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockRoutine = {
    id: 'routine-1',
    name: 'Morning Routine',
    type: 'MORNING',
    steps: [
      { id: 'step-1', name: 'Brush teeth', icon: '🪥', estimatedMinutes: 2, sortOrder: 0 },
      { id: 'step-2', name: 'Get dressed', icon: '👕', estimatedMinutes: 5, sortOrder: 1 },
      { id: 'step-3', name: 'Eat breakfast', icon: '🍳', estimatedMinutes: 15, sortOrder: 2 },
    ],
  };

  it('should render routine name and type', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Morning Routine' })).toBeInTheDocument();
    expect(screen.getByText('Morning', { selector: 'span' })).toBeInTheDocument();
  });

  it('should render all steps in order', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    expect(screen.getByText('Brush teeth')).toBeInTheDocument();
    expect(screen.getByText('Get dressed')).toBeInTheDocument();
    expect(screen.getByText('Eat breakfast')).toBeInTheDocument();
  });

  it('should display step icons', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    expect(screen.getByText('🪥')).toBeInTheDocument();
    expect(screen.getByText('👕')).toBeInTheDocument();
    expect(screen.getByText('🍳')).toBeInTheDocument();
  });

  it('should display estimated time for steps', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    // Each step should display its estimated time
    const timeElements = screen.getAllByText(/\d+ min/i);
    expect(timeElements.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByText('5 min')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('should allow checking off steps', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).toBeChecked();
  });

  it('should show progress indicator', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    expect(screen.getByText(/0 of 3 steps completed/i)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText(/1 of 3 steps completed/i)).toBeInTheDocument();
  });

  it('should enable complete button when all steps checked', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const completeButton = screen.getByRole('button', { name: /Complete Routine/i });
    expect(completeButton).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));

    expect(completeButton).toBeEnabled();
  });

  it('should call API when complete button clicked', async () => {
    const onComplete = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Routine completed' }),
    });

    render(<RoutineExecutionView routine={mockRoutine} onComplete={onComplete} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));

    const completeButton = screen.getByRole('button', { name: /Complete Routine/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/routines/routine-1/complete',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // onComplete is called after a 1.5s delay, so wait for it
    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('should show success message after completion', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Routine completed successfully!' }),
    });

    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));

    const completeButton = screen.getByRole('button', { name: /Complete Routine/i });
    fireEvent.click(completeButton);

    await waitFor(
      () => {
        expect(screen.getByText(/completed successfully/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should show error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to complete routine' }),
    });

    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));

    const completeButton = screen.getByRole('button', { name: /Complete Routine/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to complete routine/i)).toBeInTheDocument();
    });
  });

  it('should show already completed status', () => {
    const completedRoutine = {
      ...mockRoutine,
      completedToday: true,
      completedAt: '2026-01-01T08:00:00Z',
    };

    render(<RoutineExecutionView routine={completedRoutine} onComplete={() => {}} />);

    expect(screen.getByText(/Already completed today/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete Routine/i })).not.toBeInTheDocument();
  });

  it('should display total estimated time', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    expect(screen.getByText(/Total: 22 minutes/i)).toBeInTheDocument();
  });

  it('should allow unchecking steps', () => {
    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');

    // Check first step
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // Uncheck first step
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('should show loading state during submission', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));

    const completeButton = screen.getByRole('button', { name: /Complete Routine/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/Completing/i)).toBeInTheDocument();
    });
  });

  it('should render without steps gracefully', () => {
    const routineWithoutSteps = {
      id: 'routine-2',
      name: 'Simple Routine',
      type: 'CUSTOM',
      steps: [],
    };

    render(<RoutineExecutionView routine={routineWithoutSteps} onComplete={() => {}} />);

    expect(screen.getByText('Simple Routine')).toBeInTheDocument();
    expect(screen.getByText(/No steps defined/i)).toBeInTheDocument();
  });

  it('should handle already completed today error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Routine already completed today' }),
    });

    render(<RoutineExecutionView routine={mockRoutine} onComplete={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));

    const completeButton = screen.getByRole('button', { name: /Complete Routine/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/already completed today/i)).toBeInTheDocument();
    });
  });
});
