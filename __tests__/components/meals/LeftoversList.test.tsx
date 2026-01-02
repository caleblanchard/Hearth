import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeftoversList from '@/app/dashboard/meals/LeftoversList';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('LeftoversList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockEmptyLeftovers = {
    leftovers: [],
  };

  const mockLeftoversWithItems = {
    leftovers: [
      {
        id: 'leftover-1',
        name: 'Lasagna',
        quantity: 'Half pan',
        storedAt: '2026-01-01T12:00:00Z',
        expiresAt: '2026-01-04T12:00:00Z',
        notes: 'From Sunday dinner',
        creator: {
          id: 'user-1',
          name: 'Mom',
        },
      },
      {
        id: 'leftover-2',
        name: 'Chicken soup',
        quantity: '2 servings',
        storedAt: '2026-01-02T12:00:00Z',
        expiresAt: '2026-01-03T12:00:00Z', // Expires soon!
        notes: null,
        creator: {
          id: 'user-2',
          name: 'Dad',
        },
      },
    ],
  };

  it('should load and display leftovers on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeftoversWithItems,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument();
    });

    expect(screen.getByText('Chicken soup')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/meals/leftovers', expect.any(Object));
  });

  it('should display empty state when no leftovers exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyLeftovers,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText(/no leftovers/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockEmptyLeftovers,
            });
          }, 100);
        })
    );

    render(<LeftoversList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display quantity when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeftoversWithItems,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Half pan')).toBeInTheDocument();
      expect(screen.getByText('2 servings')).toBeInTheDocument();
    });
  });

  it('should display notes when hovering over item', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeftoversWithItems,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument();
    });

    const lasagnaItem = screen.getByText('Lasagna');
    await user.hover(lasagnaItem);

    await waitFor(() => {
      expect(screen.getByText('From Sunday dinner')).toBeInTheDocument();
    });
  });

  it('should show expiration countdown', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeftoversWithItems,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getAllByText(/expires/i).length).toBeGreaterThan(0);
    });
  });

  it('should show green indicator for items with 2+ days remaining', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const greenLeftover = {
      leftovers: [
        {
          id: 'leftover-1',
          name: 'Fresh pasta',
          storedAt: '2026-01-01T12:00:00Z',
          expiresAt: '2026-01-04T12:00:00Z', // 3 days away
          quantity: null,
          notes: null,
          creator: { id: 'user-1', name: 'Mom' },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => greenLeftover,
    });

    const { container } = render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Fresh pasta')).toBeInTheDocument();
    });

    // Check for green status indicator (could be a class, style, or text)
    const statusElement = container.querySelector('[data-status="fresh"]');
    expect(statusElement).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('should show yellow indicator for items with 1-2 days remaining', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const yellowLeftover = {
      leftovers: [
        {
          id: 'leftover-1',
          name: 'Aging rice',
          storedAt: '2026-01-01T12:00:00Z',
          expiresAt: '2026-01-02T12:00:00Z', // 1 day away
          quantity: null,
          notes: null,
          creator: { id: 'user-1', name: 'Mom' },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => yellowLeftover,
    });

    const { container } = render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Aging rice')).toBeInTheDocument();
    });

    const statusElement = container.querySelector('[data-status="warning"]');
    expect(statusElement).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('should show red indicator for items expiring today or expired', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const redLeftover = {
      leftovers: [
        {
          id: 'leftover-1',
          name: 'Expiring soup',
          storedAt: '2026-01-01T12:00:00Z',
          expiresAt: '2026-01-01T11:00:00Z', // 1 hour ago (expired)
          quantity: null,
          notes: null,
          creator: { id: 'user-1', name: 'Mom' },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => redLeftover,
    });

    const { container } = render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Expiring soup')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      const statusElement = container.querySelector('[data-status="urgent"]');
      expect(statusElement).toBeInTheDocument();
    }, { timeout: 3000 });

    jest.useRealTimers();
  });

  it('should mark leftover as used', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeftoversWithItems,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leftover: { id: 'leftover-1', usedAt: new Date() } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leftovers: [mockLeftoversWithItems.leftovers[1]] }),
      });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument();
    });

    const useButton = screen.getAllByRole('button', { name: /used/i })[0];
    await user.click(useButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/leftovers/leftover-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('used'),
        })
      );
    });
  });

  it('should mark leftover as tossed', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeftoversWithItems,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leftover: { id: 'leftover-1', tossedAt: new Date() } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leftovers: [mockLeftoversWithItems.leftovers[1]] }),
      });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument();
    });

    const tossButton = screen.getAllByRole('button', { name: /toss/i })[0];
    await user.click(tossButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/leftovers/leftover-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('tossed'),
        })
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should display creator name', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeftoversWithItems,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText(/Mom/i)).toBeInTheDocument();
      expect(screen.getByText(/Dad/i)).toBeInTheDocument();
    });
  });

  it('should refresh list after marking as used', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeftoversWithItems,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leftover: { id: 'leftover-1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyLeftovers,
      });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByText('Lasagna')).toBeInTheDocument();
    });

    const useButton = screen.getAllByRole('button', { name: /used/i })[0];
    await user.click(useButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial load, mark used, refresh
    });
  });

  it('should open add leftover dialog', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyLeftovers,
    });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add leftover/i })).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add leftover/i });
    await user.click(addButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('should create new leftover', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyLeftovers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          leftover: {
            id: 'new-1',
            name: 'Pizza',
            quantity: '2 slices',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyLeftovers,
      });

    render(<LeftoversList />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add leftover/i })).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add leftover/i });
    await user.click(addButton);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Pizza');

    const quantityInput = screen.getByLabelText(/quantity/i);
    await user.type(quantityInput, '2 slices');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/meals/leftovers',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Pizza'),
        })
      );
    });
  });
});
