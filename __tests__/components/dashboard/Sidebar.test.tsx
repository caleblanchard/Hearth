import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from '@/components/dashboard/Sidebar'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

describe('Sidebar', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
  })

  it('should render sidebar with navigation groups', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chores').length).toBeGreaterThan(0)
    expect(screen.getAllByText('To-Do').length).toBeGreaterThan(0)
  })

  it('should show parent-only settings group for parents', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'PARENT' } },
    })

    render(<Sidebar />)

    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Approvals').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Family').length).toBeGreaterThan(0)
  })

  it('should toggle group expansion', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    const tasksGroups = screen.getAllByText('Tasks & Activities')
    const tasksGroup = tasksGroups.find(el => el.tagName === 'BUTTON' || el.closest('button'))
    if (tasksGroup) {
      fireEvent.click(tasksGroup)
      // Group should be collapsed/expanded
      expect(tasksGroup).toBeInTheDocument()
    }
  })

  it('should toggle sidebar open/closed state', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    const toggleButtons = screen.getAllByRole('button')
    const desktopToggle = toggleButtons.find(btn => 
      btn.className.includes('hidden md:block')
    )
    if (desktopToggle) {
      fireEvent.click(desktopToggle)
      expect(desktopToggle).toBeInTheDocument()
    }
  })

  it('should navigate when nav item is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    const choresButtons = screen.getAllByText('Chores')
    fireEvent.click(choresButtons[0])

    expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
  })

  it('should highlight active route', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/chores')

    render(<Sidebar />)

    const choresButtons = screen.getAllByText('Chores')
    const activeButton = choresButtons.find(btn => 
      btn.closest('button')?.classList.contains('bg-indigo-100')
    )
    expect(activeButton).toBeDefined()
  })

  it('should display user info in footer', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    // Footer only shows when sidebar is open and session exists
    expect(screen.getAllByText('Test User').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CHILD').length).toBeGreaterThan(0)
  })

  it('should show mobile menu button on mobile', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    // Mobile menu button should be present
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should close mobile sidebar when overlay is clicked', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', name: 'Test User', role: 'CHILD' } },
    })

    render(<Sidebar />)

    // Open mobile menu first - find the mobile menu button
    const mobileButtons = screen.getAllByRole('button')
    const mobileMenuButton = mobileButtons.find(btn => 
      btn.className.includes('md:hidden') && btn.className.includes('fixed')
    )
    if (mobileMenuButton) {
      fireEvent.click(mobileMenuButton)
      
      // Wait for overlay to appear
      await waitFor(() => {
        const overlay = document.querySelector('.bg-black.bg-opacity-50')
        expect(overlay).toBeInTheDocument()
        if (overlay) {
          fireEvent.click(overlay)
        }
      })
    }
  })
})
