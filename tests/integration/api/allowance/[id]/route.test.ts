import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

function loadAllowanceByIdRoute() {
  jest.resetModules()

  class MockAllowanceScheduleLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  const mockGetAllowanceScheduleLifecycleSchedule = jest.fn()
  const mockUpdateAllowanceScheduleLifecycleSchedule = jest.fn()
  const mockSetAllowanceScheduleLifecyclePaused = jest.fn()
  const mockDeactivateAllowanceScheduleLifecycleSchedule = jest.fn()

  jest.doMock('@/lib/data/allowance-schedule-lifecycle', () => ({
    AllowanceScheduleLifecycleError: MockAllowanceScheduleLifecycleError,
    isAllowanceScheduleLifecycleError: (error: unknown) =>
      error instanceof MockAllowanceScheduleLifecycleError,
    getAllowanceScheduleLifecycleSchedule: mockGetAllowanceScheduleLifecycleSchedule,
    updateAllowanceScheduleLifecycleSchedule: mockUpdateAllowanceScheduleLifecycleSchedule,
    setAllowanceScheduleLifecyclePaused: mockSetAllowanceScheduleLifecyclePaused,
    deactivateAllowanceScheduleLifecycleSchedule: mockDeactivateAllowanceScheduleLifecycleSchedule,
  }))

  const handlers = require('@/app/api/allowance/[id]/route')

  return {
    ...handlers,
    MockAllowanceScheduleLifecycleError,
    mockGetAllowanceScheduleLifecycleSchedule,
    mockUpdateAllowanceScheduleLifecycleSchedule,
    mockSetAllowanceScheduleLifecyclePaused,
    mockDeactivateAllowanceScheduleLifecycleSchedule,
  }
}

describe('/api/allowance/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates schedule reads to Allowance Schedule Lifecycle', async () => {
    const { GET, mockGetAllowanceScheduleLifecycleSchedule } =
      loadAllowanceByIdRoute()

    mockGetAllowanceScheduleLifecycleSchedule.mockResolvedValue({
      id: 'schedule-1',
      memberId: 'child-1',
      amount: 10,
      frequency: 'WEEKLY',
      dayOfWeek: 1,
      dayOfMonth: null,
      isActive: true,
      isPaused: false,
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: null,
      lastProcessedAt: null,
      member: { id: 'child-1', name: 'Alice', email: 'alice@example.com' },
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/allowance/schedule-1'),
      { params: Promise.resolve({ id: 'schedule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.schedule.id).toBe('schedule-1')
    expect(mockGetAllowanceScheduleLifecycleSchedule).toHaveBeenCalledWith(
      'schedule-1'
    )
  })

  it('delegates schedule updates to Allowance Schedule Lifecycle', async () => {
    const { PUT, mockUpdateAllowanceScheduleLifecycleSchedule } =
      loadAllowanceByIdRoute()

    mockUpdateAllowanceScheduleLifecycleSchedule.mockResolvedValue({
      id: 'schedule-1',
      memberId: 'child-1',
      amount: 20,
      frequency: 'WEEKLY',
      dayOfWeek: 2,
      dayOfMonth: null,
      isActive: true,
      isPaused: false,
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: null,
      lastProcessedAt: null,
      member: { id: 'child-1', name: 'Alice', email: 'alice@example.com' },
    })

    const response = await PUT(
      new NextRequest('http://localhost:3000/api/allowance/schedule-1', {
        method: 'PUT',
        body: JSON.stringify({
          amount: 20,
          frequency: 'WEEKLY',
          dayOfWeek: 2,
        }),
      }),
      { params: Promise.resolve({ id: 'schedule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.schedule.amount).toBe(20)
    expect(mockUpdateAllowanceScheduleLifecycleSchedule).toHaveBeenCalledWith(
      'schedule-1',
      {
        amount: 20,
        frequency: 'WEEKLY',
        dayOfWeek: 2,
      }
    )
  })

  it('delegates pause or resume changes to Allowance Schedule Lifecycle', async () => {
    const { PATCH, mockSetAllowanceScheduleLifecyclePaused } =
      loadAllowanceByIdRoute()

    mockSetAllowanceScheduleLifecyclePaused.mockResolvedValue({
      id: 'schedule-1',
      memberId: 'child-1',
      amount: 10,
      frequency: 'WEEKLY',
      dayOfWeek: 1,
      dayOfMonth: null,
      isActive: true,
      isPaused: true,
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: null,
      lastProcessedAt: null,
      member: { id: 'child-1', name: 'Alice', email: 'alice@example.com' },
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/allowance/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ isPaused: true }),
      }),
      { params: Promise.resolve({ id: 'schedule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.schedule.isPaused).toBe(true)
    expect(mockSetAllowanceScheduleLifecyclePaused).toHaveBeenCalledWith(
      'schedule-1',
      true
    )
  })

  it('delegates deactivation to Allowance Schedule Lifecycle', async () => {
    const { DELETE, mockDeactivateAllowanceScheduleLifecycleSchedule } =
      loadAllowanceByIdRoute()

    mockDeactivateAllowanceScheduleLifecycleSchedule.mockResolvedValue(undefined)

    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/allowance/schedule-1'),
      { params: Promise.resolve({ id: 'schedule-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockDeactivateAllowanceScheduleLifecycleSchedule).toHaveBeenCalledWith(
      'schedule-1'
    )
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    const {
      GET,
      MockAllowanceScheduleLifecycleError,
      mockGetAllowanceScheduleLifecycleSchedule,
    } = loadAllowanceByIdRoute()

    mockGetAllowanceScheduleLifecycleSchedule.mockRejectedValue(
      new MockAllowanceScheduleLifecycleError(404, 'Allowance schedule not found')
    )

    const response = await GET(
      new NextRequest('http://localhost:3000/api/allowance/missing'),
      { params: Promise.resolve({ id: 'missing' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Allowance schedule not found')
  })
})
