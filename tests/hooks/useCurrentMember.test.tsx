import { renderHook } from '@testing-library/react'
import { useCurrentMember } from '@/hooks/useCurrentMember'
import { useCurrentFamilyMember } from '@/hooks/useCurrentFamilyMember'

jest.mock('@/hooks/useCurrentFamilyMember', () => ({
  useCurrentFamilyMember: jest.fn(),
}))

describe('useCurrentMember', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exposes the shared current family member record with role helpers', () => {
    const member = {
      id: 'member-1',
      name: 'Parent One',
      email: null,
      role: 'PARENT' as const,
      familyId: 'family-1',
      avatarUrl: null,
      birthDate: null,
      isActive: true,
    }
    ;(useCurrentFamilyMember as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'parent@example.com' },
      member,
      loading: false,
      error: null,
    })

    const { result } = renderHook(() => useCurrentMember())

    expect(useCurrentFamilyMember).toHaveBeenCalledWith({
      activeFamilyId: undefined,
      familyLoading: undefined,
      kioskFallbackName: 'Current Member',
      setActiveFamilyId: undefined,
    })
    expect(result.current.user).toEqual({ id: 'user-1', email: 'parent@example.com' })
    expect(result.current.member).toEqual(member)
    expect(result.current.isParent).toBe(true)
    expect(result.current.isChild).toBe(false)
  })
})
