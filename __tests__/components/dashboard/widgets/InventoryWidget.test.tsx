import { render, screen, waitFor } from '@testing-library/react';
import InventoryWidget from '@/components/dashboard/widgets/InventoryWidget';

// Mock fetch
global.fetch = jest.fn();

describe('InventoryWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockItems = [
    {
      id: 'item-1',
      name: 'Milk',
      category: 'GROCERIES',
      currentQuantity: 0,
      lowStockThreshold: 2,
      unit: 'gallons',
      location: 'Refrigerator',
    },
    {
      id: 'item-2',
      name: 'Paper Towels',
      category: 'HOUSEHOLD',
      currentQuantity: 1,
      lowStockThreshold: 3,
      unit: 'rolls',
      location: 'Pantry',
    },
    {
      id: 'item-3',
      name: 'Batteries (AA)',
      category: 'HOUSEHOLD',
      currentQuantity: 4,
      lowStockThreshold: 8,
      unit: 'count',
      location: 'Utility Drawer',
    },
  ];

  it('should render widget title', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<InventoryWidget />);
    expect(screen.getByRole('heading', { name: /inventory/i })).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<InventoryWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display low stock items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    render(<InventoryWidget />);

    await waitFor(() => {
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.getByText('Paper Towels')).toBeInTheDocument();
      expect(screen.getByText('Batteries (AA)')).toBeInTheDocument();
    });
  });

  it('should display empty state when no low stock items', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<InventoryWidget />);

    await waitFor(() => {
      expect(screen.getByText(/all items well stocked/i)).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<InventoryWidget />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should display quantity and unit for each item', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockItems }),
    });

    render(<InventoryWidget />);

    await waitFor(() => {
      expect(screen.getByText(/0 gallons/i)).toBeInTheDocument();
      expect(screen.getByText(/1 rolls/i)).toBeInTheDocument();
      expect(screen.getByText(/4 count/i)).toBeInTheDocument();
    });
  });
});
