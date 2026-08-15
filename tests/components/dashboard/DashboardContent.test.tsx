import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardContent from '@/components/dashboard/DashboardContent'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { useGuestSession } from '@/hooks/useGuestSession'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/useDashboardLayout', () => ({
  useDashboardLayout: jest.fn(),
}))

jest.mock('@/hooks/useSupabaseSession', () => ({
  useSupabaseSession: jest.fn(),
}))

jest.mock('@/hooks/useGuestSession', () => ({
  useGuestSession: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('DashboardContent', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useGuestSession as jest.Mock).mockReturnValue({
      guestSession: null,
      loading: false,
    })
    ;(useDashboardLayout as jest.Mock).mockReturnValue({
      layout: [],
      availableWidgets: [],
      saveLayout: jest.fn(),
      resetLayout: jest.fn(),
    })
  })

  const mockDashboardSnapshot = {
    capturedAt: new Date().toISOString(),
    partial: false,
    viewer: {
      memberId: 'user-1',
      role: 'PARENT',
      access: 'full',
    },
    issues: [],
    cards: [
      {
        kind: 'chores',
        title: "Today's Chores",
        href: '/dashboard/chores',
        state: 'ready',
        badge: { label: '1/2', tone: 'neutral' },
        summary: [{ label: 'Pending', value: '1' }],
        preview: [
          {
            id: 'chore-1',
            primary: 'Test Chore',
            secondary: '+10 credits',
            meta: 'pending',
            tone: 'warning',
          },
          {
            id: 'chore-2',
            primary: 'Completed Chore',
            secondary: '+20 credits',
            meta: 'approved',
            tone: 'good',
          },
        ],
        moreCount: 0,
      },
      {
        kind: 'screentime',
        title: 'Screen Time',
        href: '/dashboard/screentime',
        state: 'ready',
        badge: { label: '60 min', tone: 'good' },
        summary: [{ label: 'Weekly Allocation', value: '120 min' }],
        preview: [
          {
            id: 'allowance-1',
            primary: 'Educational',
            secondary: '60m remaining',
            meta: '50%',
            tone: 'good',
          },
        ],
        moreCount: 0,
      },
      {
        kind: 'credits',
        title: 'Credits',
        href: '/dashboard/rewards',
        state: 'ready',
        badge: { label: '100', tone: 'neutral' },
        summary: [
          { label: 'Current Balance', value: '100 credits' },
          { label: 'Lifetime Earned', value: '200' },
          { label: 'Lifetime Spent', value: '100' },
        ],
        preview: [],
        moreCount: 0,
      },
      {
        kind: 'shopping',
        title: 'Shopping List',
        href: '/dashboard/shopping',
        state: 'ready',
        badge: { label: '5', tone: 'warning' },
        summary: [{ label: 'Urgent Items', value: '2' }],
        preview: [
          {
            id: 'item-1',
            primary: 'Milk',
            secondary: '1 gallon',
            meta: 'Urgent',
            tone: 'alert',
          },
        ],
        moreCount: 1,
      },
      {
        kind: 'todos',
        title: 'To-Do List',
        href: '/dashboard/todos',
        state: 'ready',
        badge: { label: '1', tone: 'neutral' },
        summary: [],
        preview: [
          {
            id: 'todo-1',
            primary: 'Test Todo',
            secondary: `Due: ${new Date().toLocaleDateString()}`,
            meta: 'HIGH',
            tone: 'alert',
          },
        ],
        moreCount: 0,
      },
      {
        kind: 'calendar',
        title: 'Upcoming Events',
        href: '/dashboard/calendar?view=week',
        state: 'ready',
        badge: { label: '1', tone: 'neutral' },
        summary: [],
        preview: [
          {
            id: 'event-1',
            primary: 'Test Event',
            secondary: new Date().toLocaleDateString(),
            meta: 'Home',
          },
        ],
        moreCount: 0,
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

  const mockWidgetCollection = {
    capturedAt: new Date().toISOString(),
    partial: false,
    requested: ['weather'],
    issues: [],
    widgets: {
      weather: {
        kind: 'weather',
        state: 'ready',
        data: {
          ...mockWeatherData,
          current: {
            ...mockWeatherData.current,
            feelsLike: 70,
            condition: 'Clouds',
            icon: '02d',
          },
          forecast: [],
        },
      },
    },
  }

  const setupSuccessfulFetchMock = (snapshot = mockDashboardSnapshot) => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/widgets')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockWidgetCollection,
        })
      }
      if (url.includes('/api/settings/modules/enabled')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            enabledModules: ['CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS'],
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
        json: async () => snapshot,
      })
    })
  }

  it('should display loading state initially', () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    })
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<DashboardContent />)

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('should display error state on fetch failure', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    })
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })

  it('should display dashboard cards when the snapshot loads', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
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

  it('should navigate to chores when the chores card is clicked', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText("Today's Chores")).toBeInTheDocument()
    })

    const choresHeading = screen.getByText("Today's Chores")
    fireEvent.click(choresHeading.closest('div[class*="bg-white"]') ?? choresHeading)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
  })

  it('should display the chore empty state from the snapshot card', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    })
    setupSuccessfulFetchMock({
      ...mockDashboardSnapshot,
      cards: mockDashboardSnapshot.cards.map((card) =>
        card.kind === 'chores'
          ? {
              ...card,
              state: 'empty',
              badge: { label: '0/0', tone: 'neutral' },
              preview: [],
              emptyMessage: 'No chores scheduled for today.',
            }
          : card
      ),
    })

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('No chores scheduled for today.')).toBeInTheDocument()
    })
  })

  it('should display screen time and credits from snapshot summaries', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    })
    setupSuccessfulFetchMock()

    render(<DashboardContent />)

    await waitFor(() => {
      expect(screen.getByText('60 min')).toBeInTheDocument()
      expect(screen.getByText('100 credits')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
    })
  })

  it('should not fetch dashboard data when there is no session', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(<DashboardContent />)

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
