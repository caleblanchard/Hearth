import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardNav from '@/components/dashboard/DashboardNav'
import { useMemberContext } from '@/hooks/useMemberContext'
import { signOut } from '@/hooks/useSupabaseSession'
import { useRouter, usePathname } from 'next/navigation'

jest.mock('@/hooks/useMemberContext', () => ({
  useMemberContext: jest.fn(),
}))

jest.mock('@/hooks/useSupabaseSession', () => ({
  signOut: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

describe('DashboardNav', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }
  const mockMemberContext = (role: 'PARENT' | 'CHILD') => ({
    user: { id: 'user-1', email: 'user@test.com' },
    member: {
      id: 'member-1',
      name: 'Test User',
      email: 'user@test.com',
      role,
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
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    ;(signOut as jest.Mock).mockResolvedValue(undefined)
  })

  it('should render navigation links', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<DashboardNav />)

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chores').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rewards').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Screen Time').length).toBeGreaterThan(0)
  })

  it('should highlight active route', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/chores')

    render(<DashboardNav />)

    const choresButtons = screen.getAllByText('Chores')
    const activeButton = choresButtons.find(btn => {
      const button = btn.closest('button')
      return button && (
        button.classList.contains('bg-ember-300') || 
        button.classList.contains('bg-slate-900') ||
        button.className.includes('ember-300') ||
        button.className.includes('ember-700')
      )
    })
    expect(activeButton).toBeDefined()
  })

  it('should show parent-only navigation items for parents', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('PARENT'))

    render(<DashboardNav />)

    expect(screen.getAllByText('Approvals').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Family').length).toBeGreaterThan(0)
  })

  it('should not show parent-only items for children', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<DashboardNav />)

    expect(screen.queryByText('Approvals')).not.toBeInTheDocument()
    expect(screen.queryByText('Family')).not.toBeInTheDocument()
  })

  it('should navigate when nav item is clicked', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<DashboardNav />)

    const choresButtons = screen.getAllByText('Chores')
    fireEvent.click(choresButtons[0])

    expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
  })

  it('should call signOut when sign out button is clicked', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<DashboardNav />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(signOut).toHaveBeenCalled()
  })

  it('should display user name and role', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<DashboardNav />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('CHILD')).toBeInTheDocument()
  })

  it('should navigate to dashboard when logo is clicked', () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<DashboardNav />)

    const logo = screen.getByText('Hearth')
    fireEvent.click(logo)

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
