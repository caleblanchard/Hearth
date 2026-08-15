import { renderHook } from '@testing-library/react'
import { useCurrentFamilyMember } from '@/hooks/useCurrentFamilyMember'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'
import { useParentAuthorizationContext } from '@/hooks/useParentAuthorizationContext'

jest.mock('@/hooks/useCurrentFamilyMember', () => ({
  useCurrentFamilyMember: jest.fn(),
}))

jest.mock('@/contexts/ActiveFamilyContext', () => ({
  useActiveFamily: jest.fn(),
}))

describe('useParentAuthorizationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useActiveFamily as jest.Mock).mockReturnValue({
      activeFamilyId: 'family-1',
      setActiveFamilyId: jest.fn(),
      loading: false,
    })
  })

  it('maps the current family member into a normalized authorization record', () => {
    const setActiveFamilyId = jest.fn()
    ;(useActiveFamily as jest.Mock).mockReturnValue({
      activeFamilyId: 'family-1',
      setActiveFamilyId,
      loading: false,
    })
    ;(useCurrentFamilyMember as jest.Mock).mockReturnValue({
      user: { id: 'auth-user-1', email: 'parent@example.com' },
      member: {
        id: 'member-1',
        name: 'Parent One',
        email: 'parent@example.com',
        role: 'PARENT',
        familyId: 'family-1',
        avatarUrl: null,
        birthDate: null,
        isActive: true,
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useParentAuthorizationContext())

    expect(useCurrentFamilyMember).toHaveBeenCalledWith({
      activeFamilyId: 'family-1',
      familyLoading: false,
      kioskFallbackName: 'Kiosk Member',
      setActiveFamilyId,
    })
    expect(result.current).toMatchObject({
      memberId: 'member-1',
      familyId: 'family-1',
      role: 'PARENT',
      isParent: true,
      isChild: false,
      canManageFamily: true,
      loading: false,
      error: null,
    })
  })

  it('returns child access flags for non-parent viewers', () => {
    ;(useCurrentFamilyMember as jest.Mock).mockReturnValue({
      user: { id: 'auth-user-2', email: 'child@example.com' },
      member: {
        id: 'member-2',
        name: 'Child One',
        email: 'child@example.com',
        role: 'CHILD',
        familyId: 'family-1',
        avatarUrl: null,
        birthDate: null,
        isActive: true,
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useParentAuthorizationContext())

    expect(result.current.isParent).toBe(false)
    expect(result.current.isChild).toBe(true)
    expect(result.current.canManageFamily).toBe(false)
  })
})
