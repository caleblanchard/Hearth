import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TopBar from '@/components/dashboard/TopBar'
import { useMemberContext } from '@/hooks/useMemberContext'
import { useGuestSession } from '@/hooks/useGuestSession'
import { signOut } from '@/hooks/useSupabaseSession'
import { usePathname, useRouter } from 'next/navigation'

jest.mock('@/hooks/useMemberContext', () => ({
  useMemberContext: jest.fn(),
}))

jest.mock('@/hooks/useGuestSession', () => ({
  useGuestSession: jest.fn(),
}))

jest.mock('@/hooks/useSupabaseSession', () => ({
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
  const mockMemberContext = (name: string | null) => ({
    user: { id: 'user-1', email: 'user@test.com' },
    member: {
      id: 'member-1',
      name,
      email: 'user@test.com',
      role: 'PARENT',
      family_id: 'family-1',
      avatar_url: null,
      birth_date: null,
      is_active: true,
    },
    loading: false,
    error: null,
  })
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(signOut as jest.Mock).mockResolvedValue(undefined)
    ;(useGuestSession as jest.Mock).mockReturnValue({
      guestSession: null,
      endSession: jest.fn(),
    })
  })

  it('should display page title', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('Test User'))

    render(<TopBar />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('should display correct page title for different routes', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('Test User'))
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/chores')

    const { rerender } = render(<TopBar />)

    expect(screen.getByText('Chores')).toBeInTheDocument()

    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/rewards')
    rerender(<TopBar />)

    expect(screen.getByText('Rewards')).toBeInTheDocument()
  })

  it('should display NotificationBell component', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('Test User'))

    render(<TopBar />)

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
  })

  it('should display user info', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('Test User'))

    render(<TopBar />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should call signOut when sign out button is clicked', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('Test User'))

    render(<TopBar />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(signOut).toHaveBeenCalled()
  })

  it('should display user avatar initial', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('Test User'))

    render(<TopBar />)

    // Avatar should show first letter of name
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should handle missing user name gracefully', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext(null))

    render(<TopBar />)

    // Should still render without crashing
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
