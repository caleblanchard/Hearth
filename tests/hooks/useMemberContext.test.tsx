import { renderHook } from '@testing-library/react'
import {
  useFamilyId,
  useIsParent,
  useMemberContext,
} from '@/hooks/useMemberContext'
import { useCurrentFamilyMember } from '@/hooks/useCurrentFamilyMember'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'

jest.mock('@/hooks/useCurrentFamilyMember', () => ({
  useCurrentFamilyMember: jest.fn(),
}))

jest.mock('@/contexts/ActiveFamilyContext', () => ({
  useActiveFamily: jest.fn(),
}))

describe('useMemberContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useActiveFamily as jest.Mock).mockReturnValue({
      activeFamilyId: 'family-1',
      setActiveFamilyId: jest.fn(),
      loading: false,
    })
  })

  it('maps the shared current family member into member context', () => {
    const setActiveFamilyId = jest.fn()
    ;(useActiveFamily as jest.Mock).mockReturnValue({
      activeFamilyId: 'family-1',
      setActiveFamilyId,
      loading: false,
    })

    ;(useCurrentFamilyMember as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'parent@example.com' },
      member: {
        id: 'member-1',
        name: 'Parent One',
        email: 'parent@example.com',
        role: 'PARENT',
        familyId: 'family-1',
        avatarUrl: 'avatar.png',
        birthDate: '1988-01-01',
        isActive: true,
      },
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useMemberContext())

    expect(useCurrentFamilyMember).toHaveBeenCalledWith({
      activeFamilyId: 'family-1',
      familyLoading: false,
      kioskFallbackName: 'Kiosk Member',
      setActiveFamilyId,
    })
    expect(result.current.member).toEqual({
      id: 'member-1',
      name: 'Parent One',
      email: 'parent@example.com',
      role: 'PARENT',
      family_id: 'family-1',
      avatar_url: 'avatar.png',
      birth_date: '1988-01-01',
      is_active: true,
    })
  })

  it('drives the helper hooks from the mapped member context', () => {
    ;(useCurrentFamilyMember as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'parent@example.com' },
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

    const { result: isParent } = renderHook(() => useIsParent())
    const { result: familyId } = renderHook(() => useFamilyId())

    expect(isParent.current).toBe(true)
    expect(familyId.current).toBe('family-1')
  })
})
