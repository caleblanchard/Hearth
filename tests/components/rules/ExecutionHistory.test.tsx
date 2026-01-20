/**
 * Component Tests: Execution History
 *
 * Tests for the rule execution history component
 * Total: 10 tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useParams } from 'next/navigation';
import ExecutionHistoryPage from '@/app/dashboard/rules/[id]/history/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ExecutionHistory Component', () => {
  const mockRule = {
    id: 'rule-1',
    name: 'Weekly Allowance',
    isEnabled: true,
  };

  const mockExecutions = [
    {
      id: 'exec-1',
      success: true,
      result: { actionsCompleted: 1, actionsFailed: 0 },
      error: null,
      metadata: { triggerType: 'time_based', amount: 20 },
      executedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    },
    {
      id: 'exec-2',
      success: false,
      result: { actionsCompleted: 0, actionsFailed: 1 },
      error: 'Member ID is required',
      metadata: { triggerType: 'time_based' },
      executedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 'exec-3',
      success: true,
      result: { actionsCompleted: 2, actionsFailed: 0 },
      error: null,
      metadata: { triggerType: 'chore_completed' },
      executedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: 'rule-1' });

    // Mock fetch for both rule and executions
    (global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/rules/rule-1')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ rule: mockRule }),
          });
        }
        if (url.includes('/api/rules/executions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              executions: mockExecutions,
              total: 3,
              limit: 50,
              offset: 0,
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
  });

  it('should render loading state initially', () => {
    render(<ExecutionHistoryPage />);

    expect(screen.getByText(/loading execution history/i)).toBeInTheDocument();
  });

  it('should fetch and display execution history on mount', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      // There are 2 successful executions, so use getAllByText
      expect(screen.getAllByText('Executed Successfully').length).toBe(2);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('Execution Failed')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(global.fetch).toHaveBeenCalledWith('/api/rules/rule-1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rules/executions?ruleId=rule-1')
    );
  });

  it('should display rule name and status', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Allowance')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });

  it('should display execution statistics', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      // Check for statistics labels (appear in both stats and filter buttons)
      expect(screen.getByText('Total Executions')).toBeInTheDocument();
      expect(screen.getAllByText('Successful').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);

      // Verify the stats grid contains all three stat cards
      const statsGrid = document.querySelector('.grid.grid-cols-3');
      expect(statsGrid).toBeInTheDocument();

      // Verify there are stat values displayed
      const statValues = statsGrid?.querySelectorAll('.text-2xl.font-bold');
      expect(statValues?.length).toBe(3);
    }, { timeout: 3000 });
  });

  it('should display execution details with relative time', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      // Should show relative times
      expect(screen.getByText(/1 minute ago/i)).toBeInTheDocument();
      expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument();
      expect(screen.getByText(/1 day ago/i)).toBeInTheDocument();
    });
  });

  it('should display error messages for failed executions', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Member ID is required')).toBeInTheDocument();
    });
  });

  it('should filter executions by success status', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Executed Successfully').length).toBeGreaterThan(0);
    });

    // Click "Successful" filter
    const successButton = screen.getByRole('button', { name: /successful/i });
    fireEvent.click(successButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('success=true')
      );
    });
  });

  it('should filter executions by failed status', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Execution Failed').length).toBeGreaterThan(0);
    });

    // Click "Failed" filter
    const failedButton = screen.getByRole('button', { name: /failed/i });
    fireEvent.click(failedButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('success=false')
      );
    });
  });

  it('should expand and collapse metadata details', async () => {
    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Executed Successfully').length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Find all "View Metadata" summary elements
    const metadataToggles = screen.getAllByText(/view metadata/i);
    expect(metadataToggles.length).toBeGreaterThan(0);

    // Click the first one to expand
    fireEvent.click(metadataToggles[0]);

    // Wait for the metadata to be visible
    await waitFor(() => {
      // Check if a pre element exists (metadata is shown in a pre tag)
      const preElement = document.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      // Verify it contains JSON content with triggerType
      expect(preElement?.textContent).toContain('triggerType');
    }, { timeout: 3000 });
  });

  it('should display empty state when no executions found', async () => {
    (global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/rules/rule-1')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ rule: mockRule }),
          });
        }
        if (url.includes('/api/rules/executions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              executions: [],
              total: 0,
              limit: 50,
              offset: 0,
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

    render(<ExecutionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/no executions found/i)).toBeInTheDocument();
      expect(screen.getByText(/this rule has not been executed yet/i)).toBeInTheDocument();
    });
  });
});
