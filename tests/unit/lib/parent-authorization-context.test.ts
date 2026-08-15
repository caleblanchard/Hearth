jest.mock('@/lib/supabase/server', () => ({
  getAuthContext: jest.fn(),
}))

import {
  ParentAuthorizationContextError,
  requireParentAuthorizationContext,
  resolveParentAuthorizationContext,
} from '@/lib/auth/parent-authorization-context'

const { getAuthContext: mockGetAuthContext } = jest.requireMock('@/lib/supabase/server')

describe('parent-authorization-context', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resolves a normalized authorization record for a parent viewer', async () => {
    mockGetAuthContext.mockResolvedValue({
      user: { id: 'auth-user-1', email: 'parent@example.com' },
      memberships: [
        {
          id: 'member-1',
          family_id: 'family-1',
          name: 'Parent One',
          role: 'PARENT',
          families: {
            id: 'family-1',
            name: 'Family One',
          },
        },
      ],
      defaultFamilyId: 'family-1',
      defaultMemberId: 'member-1',
      activeFamilyId: 'family-1',
      activeMemberId: 'member-1',
    })

    const result = await resolveParentAuthorizationContext()

    expect(result).toEqual({
      user: { id: 'auth-user-1', email: 'parent@example.com' },
      memberships: [
        {
          id: 'member-1',
          familyId: 'family-1',
          name: 'Parent One',
          role: 'PARENT',
          familyName: 'Family One',
        },
      ],
      defaultFamilyId: 'family-1',
      defaultMemberId: 'member-1',
      familyId: 'family-1',
      memberId: 'member-1',
      familyName: 'Family One',
      role: 'PARENT',
      isParent: true,
      isChild: false,
      canManageFamily: true,
      activeMembership: {
        id: 'member-1',
        familyId: 'family-1',
        name: 'Parent One',
        role: 'PARENT',
        familyName: 'Family One',
      },
    })
  })

  it('falls back to the viewer role when active membership is missing', async () => {
    mockGetAuthContext.mockResolvedValue({
      user: {
        id: 'child-1',
        role: 'CHILD',
        familyId: 'family-kiosk',
        name: 'Kiosk Child',
      },
      memberships: [],
      defaultFamilyId: 'family-kiosk',
      defaultMemberId: 'child-1',
      activeFamilyId: 'family-kiosk',
      activeMemberId: 'child-1',
    })

    const result = await resolveParentAuthorizationContext()

    expect(result.role).toBe('CHILD')
    expect(result.isParent).toBe(false)
    expect(result.isChild).toBe(true)
    expect(result.canManageFamily).toBe(false)
  })

  it('throws unauthorized when no viewer auth context exists', async () => {
    mockGetAuthContext.mockResolvedValue(null)

    await expect(resolveParentAuthorizationContext()).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    })
  })

  it('throws a custom forbidden message when parent access is required', async () => {
    mockGetAuthContext.mockResolvedValue({
      user: { id: 'auth-user-2', email: 'child@example.com' },
      memberships: [
        {
          id: 'member-2',
          family_id: 'family-1',
          name: 'Child One',
          role: 'CHILD',
          families: {
            id: 'family-1',
            name: 'Family One',
          },
        },
      ],
      defaultFamilyId: 'family-1',
      defaultMemberId: 'member-2',
      activeFamilyId: 'family-1',
      activeMemberId: 'member-2',
    })

    await expect(
      requireParentAuthorizationContext({
        forbiddenMessage: 'Only parents can view the approval queue',
      })
    ).rejects.toEqual(
      new ParentAuthorizationContextError(403, 'Only parents can view the approval queue')
    )
  })
})
