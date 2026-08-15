jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/auth/parent-authorization-context', () => ({
  requireParentAuthorizationContext: jest.fn(),
  ParentAuthorizationContextError: class MockParentAuthorizationContextError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { LifecycleError } from '@/lib/data/lifecycle-core'
import {
  createAllowanceScheduleLifecycleSchedule,
  listAllowanceScheduleLifecycleSchedules,
  setAllowanceScheduleLifecyclePaused,
} from '@/lib/data/allowance-schedule-lifecycle'

const {
  requireParentAuthorizationContext: mockRequireParentAuthorizationContext,
} = jest.requireMock('@/lib/auth/parent-authorization-context')
const { createClient: mockCreateClient } = jest.requireMock('@/lib/supabase/server')

function createSelectChain(result: { data: unknown; error: unknown }) {
  return {
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
}

describe('allowance-schedule-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockRequireParentAuthorizationContext.mockResolvedValue({
      familyId: 'family-1',
      memberId: 'parent-1',
      memberships: [],
      activeMembership: {
        id: 'parent-1',
        familyId: 'family-1',
        role: 'PARENT',
        name: 'Parent One',
      },
    })
  })

  it('rejects weekly schedules without a day of week', async () => {
    await expect(
      createAllowanceScheduleLifecycleSchedule({
        memberId: 'child-1',
        amount: 10,
        frequency: 'WEEKLY',
      })
    ).rejects.toEqual(
      new LifecycleError(
        400,
        'dayOfWeek is required for WEEKLY/BIWEEKLY frequency'
      )
    )
  })

  it('returns normalized family schedules', async () => {
    const schedulesQuery = createSelectChain({
      data: [
        {
          id: 'schedule-1',
          member_id: 'child-1',
          amount: 10,
          frequency: 'WEEKLY',
          day_of_week: 1,
          day_of_month: null,
          is_active: true,
          is_paused: false,
          start_date: '2026-05-01T00:00:00.000Z',
          end_date: null,
          last_processed_at: null,
          member: {
            id: 'child-1',
            name: 'Alice',
            email: 'alice@example.com',
          },
        },
      ],
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'allowance_schedules') {
          return { select: jest.fn(() => schedulesQuery) }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await listAllowanceScheduleLifecycleSchedules()

    expect(result.schedules).toEqual([
      expect.objectContaining({
        id: 'schedule-1',
        memberId: 'child-1',
        dayOfWeek: 1,
        isActive: true,
        isPaused: false,
      }),
    ])
  })

  it('creates a schedule with normalized timing fields', async () => {
    const memberQuery = createSelectChain({
      data: {
        id: 'child-1',
        family_id: 'family-1',
        name: 'Alice',
        email: 'alice@example.com',
      },
      error: null,
    })
    const existingScheduleQuery = createSelectChain({ data: null, error: null })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'family_members') {
          return { select: jest.fn(() => memberQuery) }
        }

        if (table === 'allowance_schedules') {
          return {
            select: jest.fn(() => existingScheduleQuery),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'schedule-1',
                    member_id: 'child-1',
                    amount: 10,
                    frequency: 'WEEKLY',
                    day_of_week: 1,
                    day_of_month: null,
                    is_active: true,
                    is_paused: false,
                    start_date: '2026-05-01T00:00:00.000Z',
                    end_date: null,
                    last_processed_at: null,
                    member: {
                      id: 'child-1',
                      name: 'Alice',
                      email: 'alice@example.com',
                    },
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await createAllowanceScheduleLifecycleSchedule({
      memberId: 'child-1',
      amount: 10,
      frequency: 'WEEKLY',
      dayOfWeek: 1,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 'schedule-1',
        memberId: 'child-1',
        frequency: 'WEEKLY',
        dayOfWeek: 1,
      })
    )
  })

  it('updates pause state through the shared lifecycle', async () => {
    const scheduleQuery = createSelectChain({
      data: {
        id: 'schedule-1',
        member_id: 'child-1',
        amount: 10,
        frequency: 'WEEKLY',
        day_of_week: 1,
        day_of_month: null,
        is_active: true,
        is_paused: false,
        start_date: '2026-05-01T00:00:00.000Z',
        end_date: null,
        last_processed_at: null,
        member: {
          id: 'child-1',
          name: 'Alice',
          email: 'alice@example.com',
          family_id: 'family-1',
        },
      },
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'allowance_schedules') {
          return {
            select: jest.fn(() => scheduleQuery),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'schedule-1',
                      member_id: 'child-1',
                      amount: 10,
                      frequency: 'WEEKLY',
                      day_of_week: 1,
                      day_of_month: null,
                      is_active: true,
                      is_paused: true,
                      start_date: '2026-05-01T00:00:00.000Z',
                      end_date: null,
                      last_processed_at: null,
                      member: {
                        id: 'child-1',
                        name: 'Alice',
                        email: 'alice@example.com',
                      },
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await setAllowanceScheduleLifecyclePaused('schedule-1', true)

    expect(result.isPaused).toBe(true)
  })
})
