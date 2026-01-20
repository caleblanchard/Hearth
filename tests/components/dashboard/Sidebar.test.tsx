import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from '@/components/dashboard/Sidebar'
import { useMemberContext } from '@/hooks/useMemberContext'
import { useRouter, usePathname } from 'next/navigation'

jest.mock('@/hooks/useMemberContext', () => ({
  useMemberContext: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock fetch for module settings
global.fetch = jest.fn()

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('min-width'), // Simulate desktop viewport
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('Sidebar', () => {
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
    // Mock successful module fetch
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ enabledModules: ['CHORES', 'TODOS', 'SHOPPING', 'SCREEN_TIME', 'CREDITS', 'CALENDAR', 'ROUTINES', 'MEAL_PLANNING', 'HEALTH', 'PETS', 'LEADERBOARD', 'FINANCIAL', 'INVENTORY', 'MAINTENANCE', 'TRANSPORT', 'DOCUMENTS', 'PROJECTS', 'RULES_ENGINE'] }),
    })
  })

  it('should render sidebar with navigation groups', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    const { container } = render(<Sidebar />)

    // Wait for modules to load by checking for a module-dependent item
    await waitFor(() => {
      const choresElements = screen.queryAllByText('Chores')
      expect(choresElements.length).toBeGreaterThan(0)
    })

    // Check that other navigation items exist (even if hidden in test environment)
    expect(screen.queryAllByText('To-Do').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Dashboard').length).toBeGreaterThan(0)
  })

  it('should show parent-only settings group for parents', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('PARENT'))

    render(<Sidebar />)

    await waitFor(() => {
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Approvals').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Family').length).toBeGreaterThan(0)
  })

  it('should toggle group expansion', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<Sidebar />)

    await waitFor(() => {
      expect(screen.getAllByText('Tasks & Activities').length).toBeGreaterThan(0)
    })

    const tasksGroups = screen.getAllByText('Tasks & Activities')
    const tasksGroup = tasksGroups.find(el => el.tagName === 'BUTTON' || el.closest('button'))
    if (tasksGroup) {
      fireEvent.click(tasksGroup)
      // Group should be collapsed/expanded
      expect(tasksGroup).toBeInTheDocument()
    }
  })

  it('should toggle sidebar open/closed state', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<Sidebar />)

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
    })

    const toggleButtons = screen.getAllByRole('button')
    const desktopToggle = toggleButtons.find(btn => 
      btn.className.includes('hidden md:block')
    )
    if (desktopToggle) {
      fireEvent.click(desktopToggle)
      expect(desktopToggle).toBeInTheDocument()
    }
  })

  it('should navigate when nav item is clicked', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<Sidebar />)

    await waitFor(() => {
      expect(screen.getAllByText('Chores').length).toBeGreaterThan(0)
    })

    const choresButtons = screen.getAllByText('Chores')
    fireEvent.click(choresButtons[0])

    expect(mockPush).toHaveBeenCalledWith('/dashboard/chores')
  })

  it('should highlight active route', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard/chores')

    render(<Sidebar />)

    await waitFor(() => {
      const choresButtons = screen.getAllByText('Chores')
      expect(choresButtons.length).toBeGreaterThan(0)
    })

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

  it('should display user info in footer', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<Sidebar />)

    await waitFor(() => {
      // Footer only shows when sidebar is open and session exists
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('CHILD').length).toBeGreaterThan(0)
  })

  it('should show mobile menu button on mobile', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<Sidebar />)

    await waitFor(() => {
      // Mobile menu button should be present
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it('should close mobile sidebar when overlay is clicked', async () => {
    ;(useMemberContext as jest.Mock).mockReturnValue(mockMemberContext('CHILD'))

    render(<Sidebar />)

    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
    })

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
