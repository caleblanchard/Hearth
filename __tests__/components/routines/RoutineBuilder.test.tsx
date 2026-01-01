import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoutineBuilder from '@/components/routines/RoutineBuilder';

// Mock fetch
global.fetch = jest.fn();

describe('RoutineBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockFamilyMembers = [
    { id: 'child-1', name: 'Alice', role: 'CHILD' },
    { id: 'child-2', name: 'Bob', role: 'CHILD' },
  ];

  it('should render create form when no routine provided', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole('heading', { name: /Create Routine/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Routine Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Routine/i })).toBeInTheDocument();
  });

  it('should render edit form when routine provided', () => {
    const existingRoutine = {
      id: 'routine-1',
      name: 'Morning Routine',
      type: 'MORNING',
      assignedTo: 'child-1',
      isWeekday: true,
      isWeekend: true,
      steps: [
        { id: 'step-1', name: 'Brush teeth', icon: '🪥', estimatedMinutes: 2, sortOrder: 0 },
      ],
    };

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        routine={existingRoutine}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole('heading', { name: /Edit Routine/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Morning Routine')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('should allow entering routine name', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    const nameInput = screen.getByLabelText(/Routine Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Bedtime Routine' } });

    expect(nameInput.value).toBe('Bedtime Routine');
  });

  it('should allow selecting routine type', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    const typeSelect = screen.getByLabelText(/Type/i) as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'BEDTIME' } });

    expect(typeSelect.value).toBe('BEDTIME');
  });

  it('should allow assigning to specific child', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    const assignSelect = screen.getByLabelText(/Assign To/i) as HTMLSelectElement;
    fireEvent.change(assignSelect, { target: { value: 'child-1' } });

    expect(assignSelect.value).toBe('child-1');
  });

  it('should allow toggling weekday/weekend', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    const weekdayCheckbox = screen.getByLabelText(/Weekdays/i) as HTMLInputElement;
    const weekendCheckbox = screen.getByLabelText(/Weekends/i) as HTMLInputElement;

    expect(weekdayCheckbox.checked).toBe(true);
    expect(weekendCheckbox.checked).toBe(true);

    fireEvent.click(weekendCheckbox);
    expect(weekendCheckbox.checked).toBe(false);
  });

  it('should allow adding steps', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    const addStepButton = screen.getByRole('button', { name: /Add Step/i });
    fireEvent.click(addStepButton);

    expect(screen.getByPlaceholderText(/Step name/i)).toBeInTheDocument();
  });

  it('should allow editing step details', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    // Add a step first
    const addStepButton = screen.getByRole('button', { name: /Add Step/i });
    fireEvent.click(addStepButton);

    // Edit step details
    const stepNameInput = screen.getByPlaceholderText(/Step name/i) as HTMLInputElement;
    const iconInput = screen.getByPlaceholderText(/Icon/i) as HTMLInputElement;
    const minutesInput = screen.getByPlaceholderText(/Minutes/i) as HTMLInputElement;

    fireEvent.change(stepNameInput, { target: { value: 'Brush teeth' } });
    fireEvent.change(iconInput, { target: { value: '🪥' } });
    fireEvent.change(minutesInput, { target: { value: '2' } });

    expect(stepNameInput.value).toBe('Brush teeth');
    expect(iconInput.value).toBe('🪥');
    expect(minutesInput.value).toBe('2');
  });

  it('should allow removing steps', () => {
    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    // Add a step
    const addStepButton = screen.getByRole('button', { name: /Add Step/i });
    fireEvent.click(addStepButton);

    const stepNameInput = screen.getByPlaceholderText(/Step name/i);
    fireEvent.change(stepNameInput, { target: { value: 'Test Step' } });

    // Remove the step
    const removeButton = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeButton);

    expect(screen.queryByDisplayValue('Test Step')).not.toBeInTheDocument();
  });

  it('should allow reordering steps', () => {
    const existingRoutine = {
      id: 'routine-1',
      name: 'Morning Routine',
      type: 'MORNING',
      assignedTo: null,
      isWeekday: true,
      isWeekend: true,
      steps: [
        { id: 'step-1', name: 'Step 1', icon: null, estimatedMinutes: null, sortOrder: 0 },
        { id: 'step-2', name: 'Step 2', icon: null, estimatedMinutes: null, sortOrder: 1 },
      ],
    };

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        routine={existingRoutine}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    const moveDownButtons = screen.getAllByRole('button', { name: /Move down/i });
    fireEvent.click(moveDownButtons[0]);

    // Verify order changed
    const stepInputs = screen.getAllByPlaceholderText(/Step name/i) as HTMLInputElement[];
    expect(stepInputs[0].value).toBe('Step 2');
    expect(stepInputs[1].value).toBe('Step 1');
  });

  it('should validate required fields', async () => {
    const onSave = jest.fn();

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={onSave}
        onCancel={() => {}}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Create Routine/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    const onSave = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routine: {
          id: 'routine-1',
          name: 'Morning Routine',
          type: 'MORNING',
        },
      }),
    });

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={onSave}
        onCancel={() => {}}
      />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Routine Name/i), {
      target: { value: 'Morning Routine' },
    });
    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: 'MORNING' },
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /Create Routine/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/routines',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Morning Routine'),
        })
      );
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = jest.fn();

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('should show loading state during submission', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/Routine Name/i), {
      target: { value: 'Test' },
    });

    const submitButton = screen.getByRole('button', { name: /Create Routine/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Saving/i)).toBeInTheDocument();
    });
  });

  it('should show error message on failed submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create routine' }),
    });

    render(
      <RoutineBuilder
        familyMembers={mockFamilyMembers}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/Routine Name/i), {
      target: { value: 'Test' },
    });

    const submitButton = screen.getByRole('button', { name: /Create Routine/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to create routine/i)).toBeInTheDocument();
    });
  });
});
