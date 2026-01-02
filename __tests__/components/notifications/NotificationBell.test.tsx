import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => '2 hours ago'),
}))

// Mock fetch
global.fetch = jest.fn()

describe('NotificationBell', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  const mockNotifications = {
    notifications: [
      {
        id: 'notif-1',
        type: 'CHORE_COMPLETED',
        title: 'Chore Completed',
        message: 'You completed a chore!',
        actionUrl: '/dashboard/chores',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif-2',
        type: 'REWARD_APPROVED',
        title: 'Reward Approved',
        message: 'Your reward was approved',
        actionUrl: null,
        isRead: true,
        createdAt: new Date().toISOString(),
      },
    ],
    total: 2,
    unreadCount: 1,
    hasMore: false,
  }

  it('should render bell icon', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    })

    render(<NotificationBell />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should display unread count badge', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    })

    render(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('should display 9+ for counts over 9', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockNotifications,
        unreadCount: 15,
      }),
    })

    render(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument()
    })
  })

  it('should open dropdown when bell is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    })

    render(<NotificationBell />)

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    })

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })
  })

  it('should display notifications in dropdown', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    })

    render(<NotificationBell />)

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Chore Completed')).toBeInTheDocument()
      expect(screen.getByText('Reward Approved')).toBeInTheDocument()
    })
  })

  it('should mark notification as read when clicked', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockNotifications,
          notifications: [
            { ...mockNotifications.notifications[0], isRead: true },
            mockNotifications.notifications[1],
          ],
          unreadCount: 0,
        }),
      })

    render(<NotificationBell />)

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Chore Completed')).toBeInTheDocument()
    })

    const notification = screen.getByText('Chore Completed').closest('div')
    fireEvent.click(notification!)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/notif-1', {
        method: 'PATCH',
      })
    })
  })

  it('should navigate to actionUrl when notification is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    })

    render(<NotificationBell />)

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Chore Completed')).toBeInTheDocument()
    })

    const notification = screen.getByText('Chore Completed').closest('div')
    fireEvent.click(notification!)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
    })
  })

  it('should mark all as read when button is clicked', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockNotifications,
          notifications: mockNotifications.notifications.map((n) => ({
            ...n,
            isRead: true,
          })),
          unreadCount: 0,
        }),
      })

    render(<NotificationBell />)

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument()
    })

    const markAllButton = screen.getByText('Mark all read')
    fireEvent.click(markAllButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/mark-all-read', {
        method: 'PATCH',
      })
    })
  })

  it('should delete notification when delete button is clicked', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockNotifications,
          notifications: [mockNotifications.notifications[1]],
          total: 1,
          unreadCount: 0,
        }),
      })

    render(<NotificationBell />)

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('Chore Completed')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByTitle('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/notif-1', {
        method: 'DELETE',
      })
    })
  })

  it('should display empty state when no notifications', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [],
        total: 0,
        unreadCount: 0,
        hasMore: false,
      }),
    })

    render(<NotificationBell />)

    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument()
    })
  })

  it('should poll for notifications every 30 seconds', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    })

    render(<NotificationBell />)

    expect(global.fetch).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    jest.useRealTimers()
  })
})
