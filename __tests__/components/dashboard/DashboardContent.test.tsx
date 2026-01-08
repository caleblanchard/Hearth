import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardContent from '@/components/dashboard/DashboardContent'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('DashboardContent', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  const mockDashboardData = {
    chores: [
      {
        id: 'chore-1',
        name: 'Test Chore',
        description: 'Test description',
        status: 'PENDING',
        creditValue: 10,
        difficulty: 'MEDIUM',
        dueDate: new Date().toISOString(),
        requiresApproval: false,
      },
      {
        id: 'chore-2',
        name: 'Completed Chore',
        status: 'APPROVED',
        creditValue: 20,
        difficulty: 'EASY',
        dueDate: new Date().toISOString(),
        requiresApproval: true,
      },
    ],
    screenTime: {
      currentBalance: 60,
      weeklyAllocation: 120,
      weekStartDate: new Date().toISOString(),
    },
    credits: {
      current: 100,
      lifetimeEarned: 200,
      lifetimeSpent: 100,
    },
    shopping: {
      id: 'list-1',
      name: 'Grocery List',
      itemCount: 5,
      urgentCount: 2,
    },
    todos: [
      {
        id: 'todo-1',
        title: 'Test Todo',
        priority: 'HIGH',
        dueDate: new Date().toISOString(),
        status: 'PENDING',
      },
    ],
    events: [
      {
        id: 'event-1',
        title: 'Test Event',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        location: 'Home',
        color: 'blue',
      },
    ],
  }

  const mockWeatherData = {
    current: {
      temp: 72,
      description: 'Partly cloudy',
    },
    today: {
      high: 78,
      low: 65,
    },
    location: 'Test City',
  }

  const setupSuccessfulFetchMock = () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/weather')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockWeatherData,
        })
      }
      if (url.includes('/api/settings/modules/enabled')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            enabledModules: ['CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS']
          }),
        })
      }
      if (url.includes('/api/meals/plan')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            mealPlan: null,
            weekStart: new Date().toISOString().split('T')[0],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockDashboardData,
      })
    })
  }

  it('should display loading state initially', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<DashboardContent />)

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('should display error state on fetch failure', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })

  it('should display dashboard data when loaded', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText("Today's Chores")).toBeInTheDocument()
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Credits')).toBeInTheDocument()
      expect(screen.getByText('Shopping List')).toBeInTheDocument()
      expect(screen.getByText('To-Do List')).toBeInTheDocument()
      expect(screen.getByText('Upcoming Events')).toBeInTheDocument()
    })
  })

  it('should display chore completion count', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument() // 1 completed out of 2
    })
  })

  it('should navigate to chores when chores card is clicked', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText("Today's Chores")).toBeInTheDocument()
    })

    const choresCard = screen.getByText("Today's Chores").closest('div')
    fireEvent.click(choresCard!)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
  })

  it('should display empty state for chores when none exist', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/weather')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockWeatherData,
        })
      }
      if (url.includes('/api/settings/modules/enabled')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            enabledModules: ['CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS']
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockDashboardData,
          chores: [],
        }),
      })
    })

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('No chores scheduled for today.')).toBeInTheDocument()
    })
  })

  it('should display screen time balance', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('60 min')).toBeInTheDocument()
      expect(screen.getByText('60 / 120 min')).toBeInTheDocument()
    })
  })

  it('should display credits information', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1' } },
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('100 credits')).toBeInTheDocument()
    })
    
    // Check for credits values (may appear multiple times)
    const creditValues = screen.getAllByText('100')
    expect(creditValues.length).toBeGreaterThan(0)
    
    const earnedValues = screen.getAllByText('200')
    expect(earnedValues.length).toBeGreaterThan(0)
  })

  it('should not render when session is not available', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
    })

    const { container } = render(<DashboardContent />)

    // Component shows loading state initially, then should not fetch data
    await waitFor(() => {
      // After loading completes, if no session, data should be null
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
