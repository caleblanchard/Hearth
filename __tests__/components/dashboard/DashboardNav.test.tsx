import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardNav from '@/components/dashboard/DashboardNav'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    ;(signOut as jest.Mock).mockResolvedValue(undefined)
  })

  it('should render navigation links', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<DashboardNav />)

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chores').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rewards').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Screen Time').length).toBeGreaterThan(0)
  })

  it('should highlight active route', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/chores')

    render(<DashboardNav />)

    const choresButtons = screen.getAllByText('Chores')
    const activeButton = choresButtons.find(btn => 
      btn.closest('button')?.classList.contains('bg-indigo-100')
    )
    expect(activeButton).toBeDefined()
  })

  it('should show parent-only navigation items for parents', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'PARENT' } },
    })

    render(<DashboardNav />)

    expect(screen.getAllByText('Approvals').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Family').length).toBeGreaterThan(0)
  })

  it('should not show parent-only items for children', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<DashboardNav />)

    expect(screen.queryByText('Approvals')).not.toBeInTheDocument()
    expect(screen.queryByText('Family')).not.toBeInTheDocument()
  })

  it('should navigate when nav item is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<DashboardNav />)

    const choresButtons = screen.getAllByText('Chores')
    fireEvent.click(choresButtons[0])

    expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
  })

  it('should call signOut when sign out button is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<DashboardNav />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(signOut).toHaveBeenCalledWith({
      callbackUrl: expect.stringContaining('/auth/signin'),
    })
  })

  it('should display user name and role', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<DashboardNav />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('CHILD')).toBeInTheDocument()
  })

  it('should navigate to dashboard when logo is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<DashboardNav />)

    const logo = screen.getByText('Hearth')
    fireEvent.click(logo)

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
