/**
 * Component Tests: Rules List Page
 *
 * Tests for the main rules dashboard component
 * Total: 10 tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RulesPage from '@/app/dashboard/rules/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

// Mock fetch
global.fetch = jest.fn();

describe('RulesList Component', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockRules = [
    {
      id: 'rule-1',
      name: 'Weekly Allowance',
      description: 'Award credits every Sunday',
      trigger: { type: 'time_based', config: { cron: '0 9 * * 0' } },
      actions: [{ type: 'award_credits', config: { amount: 20 } }],
      isEnabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      creator: { id: 'user-1', name: 'Parent' },
      _count: { executions: 5 },
    },
    {
      id: 'rule-2',
      name: 'Chore Streak Bonus',
      description: 'Bonus for 7-day streak',
      trigger: { type: 'chore_streak', config: { days: 7 } },
      actions: [
        { type: 'award_credits', config: { amount: 10 } },
        { type: 'send_notification', config: { title: 'Bonus!', message: 'Great job!' } },
      ],
      isEnabled: false,
      createdAt: '2024-01-02T00:00:00Z',
      creator: { id: 'user-1', name: 'Parent' },
      _count: { executions: 12 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/settings/modules/enabled')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ enabledModules: ['RULES_ENGINE'] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ rules: mockRules }),
      });
    });
  });

  it('should render loading state initially', () => {
    render(<RulesPage />);

    expect(screen.getByText(/loading rules/i)).toBeInTheDocument();
  });

  it('should fetch and display rules on mount', async () => {
    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/rules');
  });

  it('should display rule details correctly', async () => {
    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
    });

    // Check trigger labels
    expect(screen.getAllByText('Time Based')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Chore Streak')[0]).toBeInTheDocument();

    // Check action counts
    expect(screen.getByText('1 action')).toBeInTheDocument();
    expect(screen.getByText('2 actions')).toBeInTheDocument();

    // Check execution counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should filter rules by status', async () => {
    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
    });

    // Click "Enabled" filter
    const enabledButton = screen.getByRole('button', { name: /enabled \(1\)/i });
    fireEvent.click(enabledButton);

    // Should show only enabled rule
    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
      expect(screen.queryByText('Chore Streak Bonus')).not.toBeInTheDocument();
    });

    // Click "Disabled" filter
    const disabledButton = screen.getByRole('button', { name: /disabled \(1\)/i });
    fireEvent.click(disabledButton);

    // Should show only disabled rule
    await waitFor(() => {
      expect(screen.queryByText('Weekly Allowance')).not.toBeInTheDocument();
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });
  });

  it('should toggle rule enabled status', async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/settings/modules/enabled')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ enabledModules: ['RULES_ENGINE'] }),
        });
      }
      if (url.includes('/api/rules/rule-1/toggle')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ rules: mockRules }),
      });
    });

    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
    });

    // Find and click the toggle button for the first rule
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn =>
      btn.className.includes('bg-green-600') || btn.className.includes('bg-gray-200')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/rules/rule-1/toggle',
          expect.objectContaining({ method: 'PATCH' })
        );
      });
    }
  });

  it('should delete rule with confirmation', async () => {
    // Reset and set up fresh mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/settings/modules/enabled')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ enabledModules: ['RULES_ENGINE'] }),
        });
      }
      if (url.includes('/api/rules/rule-1') && url === '/api/rules/rule-1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ rules: mockRules }),
      });
    });

    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click delete button - opens confirmation modal
    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    // Wait for modal confirmation message
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    
    // Find and click the confirm delete button in the modal
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(btn => 
      btn.textContent === 'Delete' && btn.className.includes('bg-red')
    );
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/rules/rule-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('should not delete rule if confirmation is cancelled', async () => {
    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    
    // Click cancel button instead of delete
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // fetch should only be called for initial load (rules and enabled modules), not for delete
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/rules/rule-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('should display empty state when no rules exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ rules: [] }),
    });

    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no rules found/i)).toBeInTheDocument();
      expect(screen.getByText(/get started by creating your first automation rule/i)).toBeInTheDocument();
    });
  });

  it('should display error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch rules/i)).toBeInTheDocument();
    });
  });

  it('should have navigation links to create and templates pages', async () => {
    render(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
    });

    // Check for "Create Rule" link
    const createLinks = screen.getAllByText(/create rule/i);
    expect(createLinks.length).toBeGreaterThan(0);

    // Check for "Browse Templates" link
    const templateLinks = screen.getAllByText(/browse templates/i);
    expect(templateLinks.length).toBeGreaterThan(0);
  });
});
