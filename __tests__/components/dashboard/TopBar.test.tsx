import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TopBar from '@/components/dashboard/TopBar'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

// Mock NotificationBell
jest.mock('@/components/notifications/NotificationBell', () => {
  return function MockNotificationBell() {
    return <div data-testid="notification-bell">Notification Bell</div>
  }
})

describe('TopBar', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(signOut as jest.Mock).mockResolvedValue(undefined)
  })

  it('should display page title', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    })

    render(<TopBar />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('should display correct page title for different routes', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    })
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/chores')

    const { rerender } = render(<TopBar />)

    expect(screen.getByText('Chores')).toBeInTheDocument()

    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/rewards')
    rerender(<TopBar />)

    expect(screen.getByText('Rewards')).toBeInTheDocument()
  })

  it('should display NotificationBell component', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    })

    render(<TopBar />)

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
  })

  it('should display user info', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    })

    render(<TopBar />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should call signOut when sign out button is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    })

    render(<TopBar />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(signOut).toHaveBeenCalledWith({
      callbackUrl: expect.stringContaining('/auth/signin'),
    })
  })

  it('should display user avatar initial', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User' } },
    })

    render(<TopBar />)

    // Avatar should show first letter of name
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should handle missing user name gracefully', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: null } },
    })

    render(<TopBar />)

    // Should still render without crashing
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
