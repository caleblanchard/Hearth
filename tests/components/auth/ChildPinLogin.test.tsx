import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChildPinLogin from '@/components/auth/ChildPinLogin'

// Mock fetch
global.fetch = jest.fn()

describe('ChildPinLogin', () => {
  const mockOnLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  const mockChildren = [
    { id: 'child-1', name: 'Alice', avatarUrl: null },
    { id: 'child-2', name: 'Bob', avatarUrl: null },
  ]

  it('should fetch and display children on mount', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/children')
    })

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('should show child selection screen initially', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText(/Who are you/i)).toBeInTheDocument()
    })
  })

  it('should select child when clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText(/Hi, Alice/i)).toBeInTheDocument()
      expect(screen.getByText(/Enter your PIN/i)).toBeInTheDocument()
    })
  })

  it('should display PIN input fields (6 dots)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      const pinDots = screen.getAllByText('')
      expect(pinDots.length).toBeGreaterThanOrEqual(6)
    })
  })

  it('should allow PIN input via number pad', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))

    // PIN should be displayed as dots
    const filledDots = screen.getAllByText('•')
    expect(filledDots.length).toBe(3)
  })

  it('should limit PIN to 6 digits', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    // Try to enter 7 digits
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText('1'))
    }

    // Should only have 6 dots
    const filledDots = screen.getAllByText('•')
    expect(filledDots.length).toBe(6)
  })

  it('should handle backspace to remove PIN digits', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('←'))

    const filledDots = screen.getAllByText('•')
    expect(filledDots.length).toBe(1)
  })

  it('should require minimum 4 digits for submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Sign In/i })
      expect(submitButton).toBeDisabled()
    })
  })

  it('should enable submit button when PIN is 4+ digits', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    // Enter 4 digits
    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))

    const submitButton = screen.getByRole('button', { name: /Sign In/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should call onLogin with child ID and PIN on submit', async () => {
    mockOnLogin.mockResolvedValue(undefined)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))

    const submitButton = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('child-1', '1234')
    })
  })

  it('should show loading state during login', async () => {
    mockOnLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))

    const submitButton = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitButton)

    expect(screen.getByText(/Signing in.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText(/Signing in.../i)).not.toBeInTheDocument()
    })
  })

  it('should display error message on login failure', async () => {
    const errorMessage = 'Invalid PIN'
    mockOnLogin.mockRejectedValue(new Error(errorMessage))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))

    const submitButton = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should clear PIN on login failure', async () => {
    mockOnLogin.mockRejectedValue(new Error('Invalid PIN'))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('1'))
    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('4'))

    const submitButton = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const filledDots = screen.queryAllByText('•')
      expect(filledDots.length).toBe(0) // PIN should be cleared
    })
  })

  it('should allow changing selected child', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChildren,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))

    await waitFor(() => {
      expect(screen.getByText(/Hi, Alice/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Change/i))

    await waitFor(() => {
      expect(screen.getByText(/Who are you/i)).toBeInTheDocument()
    })
  })

  it('should handle fetch error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Should not crash, but may show empty state
    expect(screen.queryByText(/Who are you/i)).toBeInTheDocument()
  })

  it('should handle non-ok fetch response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(<ChildPinLogin onLogin={mockOnLogin} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Should not crash
    expect(screen.queryByText(/Who are you/i)).toBeInTheDocument()
  })
})
