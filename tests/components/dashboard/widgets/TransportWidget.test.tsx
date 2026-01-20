import { render, screen, waitFor } from '@testing-library/react';
import TransportWidget from '@/components/dashboard/widgets/TransportWidget';

// Mock fetch
global.fetch = jest.fn();

describe('TransportWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockSchedules = [
    {
      id: 'schedule-1',
      time: '08:00:00',
      type: 'SCHOOL_DROPOFF',
      member: { id: 'member-1', name: 'John' },
      location: { id: 'loc-1', name: 'Lincoln Elementary', address: '123 Main St' },
      driver: { id: 'driver-1', name: 'Mom', phone: '555-1234', relationship: 'parent' },
      carpool: null,
    },
    {
      id: 'schedule-2',
      time: '15:30:00',
      type: 'SCHOOL_PICKUP',
      member: { id: 'member-1', name: 'John' },
      location: { id: 'loc-1', name: 'Lincoln Elementary', address: '123 Main St' },
      driver: { id: 'driver-2', name: 'Dad', phone: '555-5678', relationship: 'parent' },
      carpool: null,
    },
  ];

  it('should render widget title', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: [] }),
    });

    render(<TransportWidget />);
    expect(screen.getByRole('heading', { name: /transport/i })).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: [] }),
    });

    render(<TransportWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display transport schedules', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: mockSchedules }),
    });

    render(<TransportWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('John')).toHaveLength(2);
      expect(screen.getAllByText('Lincoln Elementary')).toHaveLength(2);
    });

    expect(screen.getByText(/8:00 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/3:30 PM/i)).toBeInTheDocument();
  });

  it('should display empty state when no schedules', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: [] }),
    });

    render(<TransportWidget />);

    await waitFor(() => {
      expect(screen.getByText(/no transport scheduled/i)).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<TransportWidget />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should format transport type labels correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: mockSchedules }),
    });

    render(<TransportWidget />);

    await waitFor(() => {
      expect(screen.getByText(/school dropoff/i)).toBeInTheDocument();
      expect(screen.getByText(/school pickup/i)).toBeInTheDocument();
    });
  });

  it('should display driver information', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: mockSchedules }),
    });

    render(<TransportWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Driver: Mom/i)).toBeInTheDocument();
      expect(screen.getByText(/Driver: Dad/i)).toBeInTheDocument();
    });
  });
});
