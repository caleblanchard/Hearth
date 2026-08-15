jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/auth/parent-authorization-context', () => ({
  resolveParentAuthorizationContext: jest.fn(),
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
  getAuthContext: jest.fn(),
}))

jest.mock('@/lib/screentime-grace', () => ({
  checkGraceEligibility: jest.fn(),
  getOrCreateGraceSettings: jest.fn(),
}))

jest.mock('@/lib/screentime-utils', () => ({
  calculateRemainingTime: jest.fn(),
}))

import { LifecycleError } from '@/lib/data/lifecycle-core'
import {
  getScreenTimeLifecycleAllowancesForMember,
  getScreenTimeLifecycleGraceStatus,
  requestScreenTimeLifecycleGrace,
  saveScreenTimeLifecycleAllowance,
} from '@/lib/data/screen-time-lifecycle'

const {
  resolveParentAuthorizationContext: mockResolveParentAuthorizationContext,
  requireParentAuthorizationContext: mockRequireParentAuthorizationContext,
} = jest.requireMock('@/lib/auth/parent-authorization-context')
const {
  createClient: mockCreateClient,
  getAuthContext: mockGetAuthContext,
} = jest.requireMock('@/lib/supabase/server')
const {
  checkGraceEligibility: mockCheckGraceEligibility,
  getOrCreateGraceSettings: mockGetOrCreateGraceSettings,
} = jest.requireMock('@/lib/screentime-grace')
const { calculateRemainingTime: mockCalculateRemainingTime } = jest.requireMock(
  '@/lib/screentime-utils'
)

function createSelectChain(result: { data: unknown; error: unknown }) {
  return {
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  }
}

describe('screen-time-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockResolveParentAuthorizationContext.mockResolvedValue({
      familyId: 'family-1',
      memberId: 'parent-1',
      memberships: [
        {
          id: 'parent-1',
          familyId: 'family-1',
          role: 'PARENT',
        },
      ],
    })

    mockRequireParentAuthorizationContext.mockResolvedValue({
      familyId: 'family-1',
      memberId: 'parent-1',
      memberships: [
        {
          id: 'parent-1',
          familyId: 'family-1',
          role: 'PARENT',
        },
      ],
      activeMembership: {
        id: 'parent-1',
        familyId: 'family-1',
        role: 'PARENT',
        name: 'Parent One',
      },
    })

    mockGetAuthContext.mockResolvedValue({
      user: { id: 'auth-1' },
      activeFamilyId: 'family-1',
      activeMemberId: 'child-1',
    })
  })

  it('rejects invalid allowance period updates', async () => {
    await expect(
      saveScreenTimeLifecycleAllowance({
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 60,
        period: 'MONTHLY' as any,
      })
    ).rejects.toEqual(
      new LifecycleError(400, 'Invalid period - must be DAILY or WEEKLY')
    )
  })

  it('returns normalized member allowances with remaining-time details', async () => {
    const familyMemberQuery = createSelectChain({
      data: { id: 'child-1', family_id: 'family-1', name: 'Child One' },
      error: null,
    })
    const allowancesQuery = {
      eq: jest
        .fn()
        .mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'allowance-1',
            member_id: 'child-1',
            screen_time_type_id: 'type-1',
            allowance_minutes: 90,
            period: 'WEEKLY',
            rollover_enabled: true,
            rollover_cap_minutes: 30,
            created_at: '2026-05-28T00:00:00.000Z',
            updated_at: '2026-05-28T01:00:00.000Z',
            screen_time_type: {
              id: 'type-1',
              name: 'Gaming',
              description: 'Games',
              is_active: true,
              is_archived: false,
            },
          },
        ],
        error: null,
      }),
    }

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'family_members') {
          return {
            select: jest.fn(() => familyMemberQuery),
          }
        }

        if (table === 'screen_time_allowances') {
          return {
            select: jest.fn(() => allowancesQuery),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    mockCalculateRemainingTime.mockResolvedValue({
      remainingMinutes: 45,
      usedMinutes: 75,
      allowanceMinutes: 90,
      rolloverMinutes: 30,
      periodStart: new Date('2026-05-26T00:00:00.000Z'),
      periodEnd: new Date('2026-06-02T00:00:00.000Z'),
    })

    const result = await getScreenTimeLifecycleAllowancesForMember('child-1')

    expect(result.member).toEqual({
      id: 'child-1',
      name: 'Child One',
    })
    expect(result.allowances).toEqual([
      expect.objectContaining({
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 90,
        period: 'WEEKLY',
        rolloverEnabled: true,
        rolloverCapMinutes: 30,
        remaining: expect.objectContaining({
          remainingMinutes: 45,
          usedMinutes: 75,
          rolloverMinutes: 30,
        }),
      }),
    ])
  })

  it('maps grace status from the shared grace helpers and member balance', async () => {
    const balanceQuery = createSelectChain({
      data: {
        member_id: 'child-1',
        current_balance_minutes: 8,
      },
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'screen_time_balances') {
          return {
            select: jest.fn(() => balanceQuery),
          }
        }

        if (table === 'grace_period_logs') {
          const graceLogsQuery = {
            eq: jest.fn().mockReturnThis(),
          }

          return {
            select: jest.fn(() => graceLogsQuery),
          }
        }

        if (table === 'family_members') {
          return {
            select: jest.fn(() => createSelectChain({
              data: { id: 'child-1', family_id: 'family-1', name: 'Child One' },
              error: null,
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    mockGetOrCreateGraceSettings.mockResolvedValue({
      id: 'grace-settings-1',
      member_id: 'child-1',
      grace_period_minutes: 15,
      max_grace_per_day: 2,
      max_grace_per_week: 5,
      grace_repayment_mode: 'DEDUCT_NEXT_WEEK',
      low_balance_warning_minutes: 10,
      requires_approval: true,
      created_at: '2026-05-28T00:00:00.000Z',
      updated_at: '2026-05-28T00:00:00.000Z',
    })
    mockCheckGraceEligibility.mockResolvedValue({
      eligible: true,
      remainingDaily: 2,
      remainingWeekly: 5,
    })

    const result = await getScreenTimeLifecycleGraceStatus()

    expect(result).toEqual(
      expect.objectContaining({
        canRequestGrace: true,
        currentBalance: 8,
        lowBalanceWarning: true,
        remainingDailyRequests: 2,
        remainingWeeklyRequests: 5,
        settings: expect.objectContaining({
          gracePeriodMinutes: 15,
          requiresApproval: true,
        }),
      })
    )
  })

  it('auto-approves grace requests when approval is disabled', async () => {
    const updatedBalance = { current_balance_minutes: 23 }
    const transaction = { id: 'tx-1', balance_after: 23 }
    const graceLog = {
      id: 'log-1',
      member_id: 'child-1',
      minutes_granted: 15,
      approved_by_id: 'child-1',
      repayment_status: 'PENDING',
      reason: 'Middle of a game',
      requested_at: '2026-05-28T10:00:00.000Z',
      related_transaction_id: 'tx-1',
    }

    const balanceQuery = createSelectChain({
      data: {
        member_id: 'child-1',
        current_balance_minutes: 8,
      },
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'screen_time_balances') {
          return {
            select: jest.fn(() => balanceQuery),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: updatedBalance, error: null }),
            })),
          }
        }

        if (table === 'screen_time_transactions') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: transaction, error: null }),
              })),
            })),
          }
        }

        if (table === 'grace_period_logs') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: graceLog, error: null }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    mockGetOrCreateGraceSettings.mockResolvedValue({
      id: 'grace-settings-1',
      member_id: 'child-1',
      grace_period_minutes: 15,
      max_grace_per_day: 2,
      max_grace_per_week: 5,
      grace_repayment_mode: 'DEDUCT_NEXT_WEEK',
      low_balance_warning_minutes: 10,
      requires_approval: false,
      created_at: '2026-05-28T00:00:00.000Z',
      updated_at: '2026-05-28T00:00:00.000Z',
    })
    mockCheckGraceEligibility.mockResolvedValue({
      eligible: true,
      remainingDaily: 1,
      remainingWeekly: 4,
    })

    const result = await requestScreenTimeLifecycleGrace({
      reason: 'Middle of a game',
    })

    expect(result.pendingApproval).toBe(false)
    expect(result.newBalance).toBe(23)
    expect(result.graceLog).toEqual(
      expect.objectContaining({
        id: 'log-1',
        minutesGranted: 15,
      })
    )
  })
})
