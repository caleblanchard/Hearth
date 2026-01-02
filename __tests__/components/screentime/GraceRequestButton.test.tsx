import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import GraceRequestButton from '@/components/screentime/GraceRequestButton'

// Mock fetch
global.fetch = jest.fn()

describe('GraceRequestButton', () => {
  const mockOnGraceGranted = jest.fn()

  const mockStatus = {
    canRequestGrace: true,
    currentBalance: 5,
    lowBalanceWarning: true,
    remainingDailyRequests: 2,
    remainingWeeklyRequests: 5,
    nextResetTime: new Date().toISOString(),
    settings: {
      gracePeriodMinutes: 15,
      maxGracePerDay: 3,
      maxGracePerWeek: 10,
      requiresApproval: false,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not render when balance is not low', () => {
    const { container } = render(
      <GraceRequestButton
        status={{ ...mockStatus, lowBalanceWarning: false }}
        onGraceGranted={mockOnGraceGranted}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when grace cannot be requested', () => {
    const { container } = render(
      <GraceRequestButton
        status={{ ...mockStatus, canRequestGrace: false }}
        onGraceGranted={mockOnGraceGranted}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render when balance is low and grace can be requested', () => {
    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    expect(screen.getByText('Running low on screen time!')).toBeInTheDocument()
    expect(screen.getByText('Finish the Round')).toBeInTheDocument()
  })

  it('should open modal when button is clicked', () => {
    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    expect(screen.getAllByText('Request Grace Period').length).toBeGreaterThan(0)
  })

  it('should request grace period successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        newBalance: 20,
        pendingApproval: false,
      }),
    })

    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getAllByText('Request Grace Period').length).toBeGreaterThan(0)
    })

    const requestButtons = screen.getAllByText('Request Grace Period')
    // Find the button (not the heading)
    const requestButton = requestButtons.find(btn => btn.tagName === 'BUTTON' || btn.closest('button'))
    if (requestButton) {
      fireEvent.click(requestButton)
    } else {
      // Fallback: click the first button found
      const buttons = screen.getAllByRole('button')
      const graceButton = buttons.find(btn => btn.textContent?.includes('Request Grace Period'))
      if (graceButton) fireEvent.click(graceButton)
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/screentime/grace/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: undefined }),
      })
    })

    await waitFor(() => {
      expect(mockOnGraceGranted).toHaveBeenCalledWith(20)
    })
  })

  it('should handle pending approval', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        newBalance: 20,
        pendingApproval: true,
      }),
    })

    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getAllByText('Request Grace Period').length).toBeGreaterThan(0)
    })

    const requestButtons = screen.getAllByText('Request Grace Period')
    // Find the button (not the heading)
    const requestButton = requestButtons.find(btn => btn.tagName === 'BUTTON' || btn.closest('button'))
    if (requestButton) {
      fireEvent.click(requestButton)
    } else {
      // Fallback: click the first button found
      const buttons = screen.getAllByRole('button')
      const graceButton = buttons.find(btn => btn.textContent?.includes('Request Grace Period'))
      if (graceButton) fireEvent.click(graceButton)
    }

    await waitFor(() => {
      expect(
        screen.getByText('Your request is pending approval from a parent.')
      ).toBeInTheDocument()
    })

    expect(mockOnGraceGranted).not.toHaveBeenCalled()
  })

  it('should handle request error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Request limit exceeded' }),
    })

    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getAllByText('Request Grace Period').length).toBeGreaterThan(0)
    })

    const requestButtons = screen.getAllByText('Request Grace Period')
    // Find the button (not the heading)
    const requestButton = requestButtons.find(btn => btn.tagName === 'BUTTON' || btn.closest('button'))
    if (requestButton) {
      fireEvent.click(requestButton)
    } else {
      // Fallback: click the first button found
      const buttons = screen.getAllByRole('button')
      const graceButton = buttons.find(btn => btn.textContent?.includes('Request Grace Period'))
      if (graceButton) fireEvent.click(graceButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Request limit exceeded')).toBeInTheDocument()
    })
  })

  it('should close modal when cancel is clicked', async () => {
    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    expect(screen.getAllByText('Request Grace Period').length).toBeGreaterThan(0)

    const cancelButtons = screen.getAllByText('Cancel')
    const cancelButton = cancelButtons.find(btn => btn.tagName === 'BUTTON')
    if (cancelButton) {
      fireEvent.click(cancelButton)
    }

    await waitFor(() => {
      expect(screen.queryByText('Request Grace Period')).not.toBeInTheDocument()
    })
  })

  it('should include reason in request when provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        newBalance: 20,
        pendingApproval: false,
      }),
    })

    render(
      <GraceRequestButton status={mockStatus} onGraceGranted={mockOnGraceGranted} />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByLabelText('Reason (optional)')).toBeInTheDocument()
    })

    const reasonInput = screen.getByLabelText('Reason (optional)')
    fireEvent.change(reasonInput, { target: { value: 'Middle of game level' } })

    const requestButtons = screen.getAllByText('Request Grace Period')
    // Find the button (not the heading)
    const requestButton = requestButtons.find(btn => btn.tagName === 'BUTTON' || btn.closest('button'))
    if (requestButton) {
      fireEvent.click(requestButton)
    } else {
      // Fallback: click the first button found
      const buttons = screen.getAllByRole('button')
      const graceButton = buttons.find(btn => btn.textContent?.includes('Request Grace Period'))
      if (graceButton) fireEvent.click(graceButton)
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/screentime/grace/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Middle of game level' }),
      })
    })
  })

  it('should show approval notice when requiresApproval is true', () => {
    render(
      <GraceRequestButton
        status={{
          ...mockStatus,
          settings: { ...mockStatus.settings, requiresApproval: true },
        }}
        onGraceGranted={mockOnGraceGranted}
      />
    )

    const button = screen.getByText('Finish the Round')
    fireEvent.click(button)

    expect(
      screen.getByText(/This request requires parent approval/)
    ).toBeInTheDocument()
  })
})
