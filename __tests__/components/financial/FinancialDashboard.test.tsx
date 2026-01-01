import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FinancialDashboardPage from '@/app/dashboard/financial/page'

// Mock fetch
global.fetch = jest.fn()

// Mock Recharts (simpler than rendering the actual charts)
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

describe('FinancialDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockAnalyticsData = {
    summary: {
      totalIncome: 150,
      totalExpenses: 80,
      netChange: 70,
      averageTransaction: 23.0,
      transactionCount: 10,
    },
    spendingByCategory: [
      { category: 'REWARDS', amount: 50 },
      { category: 'SAVINGS', amount: 30 },
    ],
    trends: [
      { periodKey: '2025-01', income: 50, expenses: 20 },
      { periodKey: '2025-02', income: 100, expenses: 60 },
    ],
    period: 'monthly',
  }

  it('should display loading spinner initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    )

    render(<FinancialDashboardPage />)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should fetch and display analytics data', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockAnalyticsData,
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
    })

    // Check summary cards
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('+70')).toBeInTheDocument()

    // Check stats
    expect(screen.getByText('23.0 credits')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('should display period selector buttons', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockAnalyticsData,
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Weekly')).toBeInTheDocument()
      expect(screen.getByText('Monthly')).toBeInTheDocument()
    })
  })

  it('should fetch weekly analytics when weekly button is clicked', async () => {
    let callCount = 0
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      callCount++
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockAnalyticsData,
          period: url.includes('weekly') ? 'weekly' : 'monthly',
        }),
      })
    })

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
    })

    // Initial call should be for monthly
    expect(callCount).toBe(1)

    // Click weekly button
    const weeklyButton = screen.getByText('Weekly')
    fireEvent.click(weeklyButton)

    await waitFor(() => {
      expect(callCount).toBe(2)
      expect(global.fetch).toHaveBeenCalledWith('/api/financial/analytics?period=weekly')
    })
  })

  it('should display charts when data is available', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockAnalyticsData,
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Income vs Expenses')).toBeInTheDocument()
      expect(screen.getByText('Spending by Category')).toBeInTheDocument()
    })

    // Check that chart components are rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('should display empty state when no trend data', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockAnalyticsData,
          trends: [],
        }),
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('No trend data available')).toBeInTheDocument()
    })
  })

  it('should display empty state when no spending data', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockAnalyticsData,
          spendingByCategory: [],
        }),
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('No spending data available')).toBeInTheDocument()
    })
  })

  it('should display negative net change correctly', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockAnalyticsData,
          summary: {
            ...mockAnalyticsData.summary,
            netChange: -50,
          },
        }),
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('-50')).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should display error message when analytics is null after loading', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({}),
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument()
    })
  })

  it('should display all summary card labels', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockAnalyticsData,
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Income')).toBeInTheDocument()
      expect(screen.getByText('Total Expenses')).toBeInTheDocument()
      expect(screen.getByText('Net Change')).toBeInTheDocument()
      expect(screen.getByText('Average Transaction')).toBeInTheDocument()
      expect(screen.getByText('Total Transactions')).toBeInTheDocument()
    })
  })

  it('should highlight active period button', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockAnalyticsData,
      })
    )

    render(<FinancialDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument()
    })

    const monthlyButton = screen.getByText('Monthly')
    const weeklyButton = screen.getByText('Weekly')

    // Monthly should be active initially
    expect(monthlyButton).toHaveClass('bg-indigo-600')
    expect(weeklyButton).not.toHaveClass('bg-indigo-600')

    // Click weekly
    fireEvent.click(weeklyButton)

    await waitFor(() => {
      expect(weeklyButton).toHaveClass('bg-indigo-600')
    })
  })
})
