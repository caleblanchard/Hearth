import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MedicationWidget from '@/components/dashboard/widgets/MedicationWidget';

// Mock fetch
global.fetch = jest.fn();

describe('MedicationWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    // Mock current time to a fixed date for consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockMedications = [
    {
      id: 'med-1',
      medicationName: 'Tylenol',
      activeIngredient: 'Acetaminophen',
      minIntervalHours: 6,
      maxDosesPerDay: 4,
      lastDoseAt: '2024-01-01T06:00:00Z', // 6 hours ago
      nextDoseAvailableAt: '2024-01-01T11:00:00Z', // 1 hour ago (overdue)
      notifyWhenReady: true,
      member: { id: 'member-1', name: 'John' },
      doses: [],
    },
    {
      id: 'med-2',
      medicationName: 'Ibuprofen',
      activeIngredient: 'Ibuprofen',
      minIntervalHours: 8,
      maxDosesPerDay: 3,
      lastDoseAt: '2024-01-01T08:00:00Z', // 4 hours ago
      nextDoseAvailableAt: '2024-01-01T16:00:00Z', // 4 hours from now (upcoming)
      notifyWhenReady: true,
      member: { id: 'member-2', name: 'Jane' },
      doses: [],
    },
    {
      id: 'med-3',
      medicationName: 'Vitamin D',
      activeIngredient: 'Cholecalciferol',
      minIntervalHours: 24,
      maxDosesPerDay: 1,
      lastDoseAt: '2023-12-31T12:00:00Z',
      nextDoseAvailableAt: '2024-01-02T12:00:00Z', // tomorrow (not urgent)
      notifyWhenReady: false,
      member: { id: 'member-1', name: 'John' },
      doses: [],
    },
  ];

  it('should render widget title', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ medications: [] }),
    });

    render(<MedicationWidget />);
    expect(screen.getByRole('heading', { name: /medication/i })).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ medications: [] }),
    });

    render(<MedicationWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display overdue medications', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationWidget />);

    await waitFor(() => {
      expect(screen.getByText('Tylenol')).toBeInTheDocument();
      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    });
  });

  it('should display upcoming medications within 24 hours', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('Ibuprofen').length).toBeGreaterThan(0);
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText(/in 4h/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no medications', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ medications: [] }),
    });

    render(<MedicationWidget />);

    await waitFor(() => {
      expect(screen.getByText(/no medications scheduled/i)).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<MedicationWidget />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should allow marking medication as taken', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationWidget />);

    await waitFor(() => {
      expect(screen.getByText('Tylenol')).toBeInTheDocument();
    });

    // Mock the dose logging
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Dose logged' }),
    });

    const markButton = screen.getAllByRole('button', { name: /mark as taken/i })[0];
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/medications/dose',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
