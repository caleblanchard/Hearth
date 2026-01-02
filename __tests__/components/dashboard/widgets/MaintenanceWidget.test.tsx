import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MaintenanceWidget from '@/components/dashboard/widgets/MaintenanceWidget';

// Mock fetch
global.fetch = jest.fn();

describe('MaintenanceWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockItems = [
    {
      id: 'item-1',
      title: 'Change HVAC Filter',
      description: 'Replace air filter in furnace',
      category: 'HVAC',
      nextDueAt: '2024-01-10T00:00:00Z', // 5 days overdue
      lastCompletedAt: '2023-12-10T00:00:00Z',
      intervalDays: 30,
      assignedTo: null,
    },
    {
      id: 'item-2',
      title: 'Clean Gutters',
      description: 'Remove leaves and debris',
      category: 'EXTERIOR',
      nextDueAt: '2024-01-20T00:00:00Z', // 5 days from now
      lastCompletedAt: '2023-10-20T00:00:00Z',
      intervalDays: 90,
      assignedTo: 'Dad',
    },
    {
      id: 'item-3',
      title: 'Service Lawn Mower',
      description: 'Annual spring maintenance',
      category: 'LAWN_GARDEN',
      nextDueAt: '2024-03-01T00:00:00Z', // Far future (not urgent)
      lastCompletedAt: '2023-03-01T00:00:00Z',
      intervalDays: 365,
      assignedTo: null,
    },
  ];

  it('should render widget title', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<MaintenanceWidget />);
    expect(screen.getByRole('heading', { name: /maintenance/i })).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<MaintenanceWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display upcoming maintenance items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    render(<MaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText('Change HVAC Filter')).toBeInTheDocument();
      expect(screen.getByText('Clean Gutters')).toBeInTheDocument();
    });

    // Should show "overdue" indicator
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it('should display empty state when no maintenance items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<MaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText(/no maintenance scheduled/i)).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<MaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should display category badges', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    render(<MaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText('HVAC')).toBeInTheDocument();
      expect(screen.getByText('EXTERIOR')).toBeInTheDocument();
    });
  });
});
