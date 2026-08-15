import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

function loadAllowanceRoute() {
  jest.resetModules()

  class MockAllowanceScheduleLifecycleError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  const mockListAllowanceScheduleLifecycleSchedules = jest.fn()
  const mockCreateAllowanceScheduleLifecycleSchedule = jest.fn()

  jest.doMock('@/lib/data/allowance-schedule-lifecycle', () => ({
    AllowanceScheduleLifecycleError: MockAllowanceScheduleLifecycleError,
    isAllowanceScheduleLifecycleError: (error: unknown) =>
      error instanceof MockAllowanceScheduleLifecycleError,
    listAllowanceScheduleLifecycleSchedules: mockListAllowanceScheduleLifecycleSchedules,
    createAllowanceScheduleLifecycleSchedule: mockCreateAllowanceScheduleLifecycleSchedule,
  }))

  const handlers = require('@/app/api/allowance/route')

  return {
    ...handlers,
    MockAllowanceScheduleLifecycleError,
    mockListAllowanceScheduleLifecycleSchedules,
    mockCreateAllowanceScheduleLifecycleSchedule,
  }
}

describe('/api/allowance route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates allowance schedule reads to Allowance Schedule Lifecycle', async () => {
    const {
      GET,
      mockListAllowanceScheduleLifecycleSchedules,
    } = loadAllowanceRoute()

    mockListAllowanceScheduleLifecycleSchedules.mockResolvedValue({
      schedules: [
        {
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
          member: {
            id: 'child-1',
            name: 'Alice',
            email: 'alice@example.com',
          },
        },
      ],
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.schedules).toHaveLength(1)
    expect(mockListAllowanceScheduleLifecycleSchedules).toHaveBeenCalledWith()
  })

  it('delegates allowance schedule creation to Allowance Schedule Lifecycle', async () => {
    const {
      POST,
      mockCreateAllowanceScheduleLifecycleSchedule,
    } = loadAllowanceRoute()

    mockCreateAllowanceScheduleLifecycleSchedule.mockResolvedValue({
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
      member: {
        id: 'child-1',
        name: 'Alice',
        email: 'alice@example.com',
      },
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 10,
          frequency: 'WEEKLY',
          dayOfWeek: 1,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockCreateAllowanceScheduleLifecycleSchedule).toHaveBeenCalledWith({
      memberId: 'child-1',
      amount: 10,
      frequency: 'WEEKLY',
      dayOfWeek: 1,
    })
  })

  it('maps lifecycle errors to HTTP responses', async () => {
    const {
      POST,
      MockAllowanceScheduleLifecycleError,
      mockCreateAllowanceScheduleLifecycleSchedule,
    } = loadAllowanceRoute()

    mockCreateAllowanceScheduleLifecycleSchedule.mockRejectedValue(
      new MockAllowanceScheduleLifecycleError(
        409,
        'This member already has an active allowance schedule'
      )
    )

    const response = await POST(
      new NextRequest('http://localhost:3000/api/allowance', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          amount: 10,
          frequency: 'WEEKLY',
          dayOfWeek: 1,
        }),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('This member already has an active allowance schedule')
  })
})
