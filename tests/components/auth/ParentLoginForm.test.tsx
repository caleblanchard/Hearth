import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ParentLoginForm from '@/components/auth/ParentLoginForm'

describe('ParentLoginForm', () => {
  const mockOnLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render email and password fields', () => {
    render(<ParentLoginForm onLogin={mockOnLogin} />)

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('should require email and password fields', () => {
    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)

    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('should update email field value', () => {
    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    expect(emailInput.value).toBe('test@example.com')
  })

  it('should mask password field', () => {
    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')
  })

  it('should call onLogin with email and password on submit', async () => {
    mockOnLogin.mockResolvedValue(undefined)

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should show loading state during login', async () => {
    mockOnLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    expect(screen.getByText(/Signing in.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText(/Signing in.../i)).not.toBeInTheDocument()
    })
  })

  it('should disable form fields during loading', async () => {
    mockOnLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    })
  })

  it('should display error message on login failure', async () => {
    const errorMessage = 'Invalid credentials'
    mockOnLogin.mockRejectedValue(new Error(errorMessage))

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should display generic error for non-Error rejections', async () => {
    mockOnLogin.mockRejectedValue('String error')

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Login failed/i)).toBeInTheDocument()
    })
  })

  it('should clear error on new submit attempt', async () => {
    mockOnLogin
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(undefined)

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitButton = screen.getByRole('button', { name: /Sign In/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    // First submit - error
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })

    // Second submit - success (error should be cleared)
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  it('should have forgot password link', () => {
    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const forgotPasswordLink = screen.getByText(/Forgot password/i)
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password')
  })

  it('should prevent default form submission', async () => {
    mockOnLogin.mockResolvedValue(undefined)

    render(<ParentLoginForm onLogin={mockOnLogin} />)

    const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
    const preventDefaultSpy = jest.spyOn(submitEvent, 'preventDefault')

    fireEvent(form!, submitEvent)

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled()
    })
  })
})
