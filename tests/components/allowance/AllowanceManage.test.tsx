import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ManageAllowancePage from '@/app/dashboard/allowance/manage/page'

// Mock fetch
global.fetch = jest.fn()

describe('ManageAllowancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockSchedules = [
    {
      id: 'schedule-1',
      memberId: 'child-1',
      amount: 10,
      frequency: 'WEEKLY',
      dayOfWeek: 0,
      dayOfMonth: null,
      isActive: true,
      isPaused: false,
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: null,
      lastProcessedAt: '2025-01-26T00:00:00.000Z',
      member: {
        id: 'child-1',
        name: 'Alice',
        email: 'alice@test.com',
      },
    },
    {
      id: 'schedule-2',
      memberId: 'child-2',
      amount: 20,
      frequency: 'MONTHLY',
      dayOfWeek: null,
      dayOfMonth: 15,
      isActive: true,
      isPaused: true,
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-12-31T00:00:00.000Z',
      lastProcessedAt: null,
      member: {
        id: 'child-2',
        name: 'Bob',
        email: 'bob@test.com',
      },
    },
  ]

  const mockMembers = [
    { id: 'child-1', name: 'Alice', avatarUrl: null },
    { id: 'child-2', name: 'Bob', avatarUrl: null },
  ]

  it('should display loading spinner initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    )

    render(<ManageAllowancePage />)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should fetch and display allowance schedules', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: mockSchedules }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    expect(screen.getByText('10 credits')).toBeInTheDocument()
    expect(screen.getByText('20 credits')).toBeInTheDocument()
    expect(screen.getByText('weekly on Sunday')).toBeInTheDocument()
    expect(screen.getByText('monthly on day 15')).toBeInTheDocument()
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
  })

  it('should show empty state when no schedules exist', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: [] }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('No allowance schedules configured yet.')).toBeInTheDocument()
    })

    expect(screen.getByText('Create First Schedule')).toBeInTheDocument()
  })

  it('should open add form when clicking Add Schedule button', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: [] }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('+ Add Schedule')).toBeInTheDocument()
    })

    const addButton = screen.getByText('+ Add Schedule')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Create Allowance Schedule')).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/Family Member/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount \(Credits\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Frequency/)).toBeInTheDocument()
  })

  it('should show day of week selector for WEEKLY frequency', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: [] }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('+ Add Schedule')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Add Schedule'))

    await waitFor(() => {
      expect(screen.getByText('Create Allowance Schedule')).toBeInTheDocument()
    })

    // WEEKLY is default, should show day of week
    expect(screen.getByLabelText(/Day of Week/)).toBeInTheDocument()
  })

  it('should show day of month selector for MONTHLY frequency', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: [] }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('+ Add Schedule')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Add Schedule'))

    await waitFor(() => {
      expect(screen.getByText('Create Allowance Schedule')).toBeInTheDocument()
    })

    const frequencySelect = screen.getByLabelText(/Frequency/)
    fireEvent.change(frequencySelect, { target: { value: 'MONTHLY' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/Day of Month/)).toBeInTheDocument()
    })
  })

  it('should create new schedule on form submission', async () => {
    let fetchCallCount = 0
    ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/allowance' && !options) {
        fetchCallCount++
        if (fetchCallCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ schedules: [] }),
          })
        } else {
          // After creation
          return Promise.resolve({
            ok: true,
            json: async () => ({ schedules: mockSchedules }),
          })
        }
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      if (url === '/api/allowance' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Allowance schedule created successfully!',
            schedule: mockSchedules[0]
          }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('+ Add Schedule')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Add Schedule'))

    await waitFor(() => {
      expect(screen.getByText('Create Allowance Schedule')).toBeInTheDocument()
    })

    // Fill form
    const amountInput = screen.getByLabelText(/Amount \(Credits\)/)
    fireEvent.change(amountInput, { target: { value: '10' } })

    // Submit
    const createButton = screen.getByText('Create Schedule')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/allowance',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"amount":10'),
        })
      )
    })
  })

  it('should validate amount is greater than 0', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: [] }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('+ Add Schedule')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Add Schedule'))

    await waitFor(() => {
      expect(screen.getByText('Create Allowance Schedule')).toBeInTheDocument()
    })

    const amountInput = screen.getByLabelText(/Amount \(Credits\)/)
    fireEvent.change(amountInput, { target: { value: '0' } })

    const createButton = screen.getByText('Create Schedule')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid Amount')).toBeInTheDocument()
      expect(screen.getByText('Allowance amount must be greater than 0')).toBeInTheDocument()
    })
  })

  it('should open edit form when clicking edit button', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: mockSchedules }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Find and click the first edit button
    const editButtons = screen.getAllByTitle('Edit schedule')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Allowance Schedule')).toBeInTheDocument()
    })

    // Check that form is pre-filled
    const amountInput = screen.getByLabelText(/Amount \(Credits\)/) as HTMLInputElement
    expect(amountInput.value).toBe('10')
  })

  it('should toggle pause status when clicking pause/resume button', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/allowance' && !options) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: mockSchedules }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      if (url.includes('/api/allowance/') && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Schedule updated',
          }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Find and click the pause button for the first schedule (not paused)
    const pauseButtons = screen.getAllByText('Pause')
    fireEvent.click(pauseButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/allowance/schedule-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ isPaused: true }),
        })
      )
    })
  })

  it('should show delete confirmation modal', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ schedules: mockSchedules }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // Find and click the first delete button
    const deleteButtons = screen.getAllByTitle('Delete schedule')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Delete Allowance Schedule')).toBeInTheDocument()
      expect(screen.getByText(/Delete allowance schedule for "Alice"/)).toBeInTheDocument()
    })
  })

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.reject(new Error('Network error'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should display frequency information correctly', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/allowance') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            schedules: [
              { ...mockSchedules[0], frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null },
              { ...mockSchedules[1], frequency: 'BIWEEKLY', dayOfWeek: 3, dayOfMonth: null },
            ]
          }),
        })
      }
      if (url === '/api/children') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMembers,
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<ManageAllowancePage />)

    await waitFor(() => {
      expect(screen.getByText('daily')).toBeInTheDocument()
      expect(screen.getByText('biweekly on Wednesday')).toBeInTheDocument()
    })
  })
})
