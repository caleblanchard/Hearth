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

import { LifecycleError } from '@/lib/data/lifecycle-core'
import {
  endSickModeLifecycle,
  listSickModeLifecycleInstances,
  startSickModeLifecycle,
} from '@/lib/data/sick-mode-lifecycle'

const {
  resolveParentAuthorizationContext: mockResolveParentAuthorizationContext,
  requireParentAuthorizationContext: mockRequireParentAuthorizationContext,
} = jest.requireMock('@/lib/auth/parent-authorization-context')
const {
  createClient: mockCreateClient,
  getAuthContext: mockGetAuthContext,
} = jest.requireMock('@/lib/supabase/server')

function createSelectChain(result: { data: unknown; error: unknown }) {
  return {
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  }
}

describe('sick-mode-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockGetAuthContext.mockResolvedValue({
      user: { id: 'auth-1' },
      activeFamilyId: 'family-1',
      activeMemberId: 'child-1',
    })

    mockResolveParentAuthorizationContext.mockResolvedValue({
      familyId: 'family-1',
      memberId: 'child-1',
      role: 'CHILD',
      isParent: false,
      isChild: true,
      memberships: [],
    })

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

  it('prevents children from starting sick mode for another member', async () => {
    await expect(
      startSickModeLifecycle({
        memberId: 'child-2',
      })
    ).rejects.toEqual(
      new LifecycleError(
        403,
        'Children can only start sick mode for themselves'
      )
    )
  })

  it('lists normalized active sick mode instances', async () => {
    const memberQuery = createSelectChain({
      data: {
        id: 'child-1',
        family_id: 'family-1',
      },
      error: null,
    })
    const instancesQuery = createSelectChain({
      data: [
        {
          id: 'instance-1',
          family_id: 'family-1',
          member_id: 'child-1',
          started_by: 'parent-1',
          ended_by: null,
          triggered_by: 'MANUAL',
          health_event_id: null,
          reason: 'Fever',
          is_active: true,
          started_at: '2026-05-28T10:00:00.000Z',
          ended_at: null,
          member: { id: 'child-1', name: 'Alice' },
        },
      ],
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'family_members') {
          return { select: jest.fn(() => memberQuery) }
        }

        if (table === 'sick_mode_instances') {
          return { select: jest.fn(() => instancesQuery) }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await listSickModeLifecycleInstances({
      memberId: 'child-1',
      includeEnded: false,
    })

    expect(result.instances).toEqual([
      expect.objectContaining({
        id: 'instance-1',
        familyId: 'family-1',
        memberId: 'child-1',
        triggeredBy: 'MANUAL',
      }),
    ])
  })

  it('starts sick mode with normalized instance and settings', async () => {
    const memberQuery = createSelectChain({
      data: {
        id: 'child-1',
        family_id: 'family-1',
        name: 'Alice',
      },
      error: null,
    })
    const existingInstanceQuery = createSelectChain({ data: null, error: null })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'family_members') {
          return { select: jest.fn(() => memberQuery) }
        }

        if (table === 'sick_mode_instances') {
          return {
            select: jest.fn(() => existingInstanceQuery),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'instance-1',
                    family_id: 'family-1',
                    member_id: 'child-1',
                    started_by: 'child-1',
                    ended_by: null,
                    triggered_by: 'MANUAL',
                    health_event_id: null,
                    reason: 'Fever',
                    is_active: true,
                    started_at: '2026-05-28T10:00:00.000Z',
                    ended_at: null,
                    member: { id: 'child-1', name: 'Alice' },
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === 'sick_mode_settings') {
          return {
            select: jest.fn(() => createSelectChain({
              data: {
                id: 'settings-1',
                family_id: 'family-1',
                pause_chores: true,
              },
              error: null,
            })),
          }
        }

        if (table === 'audit_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await startSickModeLifecycle({
      memberId: 'child-1',
      notes: 'Fever',
    })

    expect(result.instance).toEqual(
      expect.objectContaining({
        id: 'instance-1',
        familyId: 'family-1',
        memberId: 'child-1',
      })
    )
  })

  it('ends active sick mode through the shared lifecycle', async () => {
    const instanceQuery = createSelectChain({
      data: {
        id: 'instance-1',
        family_id: 'family-1',
        member_id: 'child-1',
        is_active: true,
        member: { id: 'child-1', name: 'Alice' },
      },
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'sick_mode_instances') {
          return {
            select: jest.fn(() => instanceQuery),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'instance-1',
                      family_id: 'family-1',
                      member_id: 'child-1',
                      is_active: false,
                      ended_by: 'parent-1',
                      ended_at: '2026-05-28T12:00:00.000Z',
                      member: { id: 'child-1', name: 'Alice' },
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }

        if (table === 'audit_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await endSickModeLifecycle('instance-1')

    expect(result.instance.isActive).toBe(false)
  })
})
