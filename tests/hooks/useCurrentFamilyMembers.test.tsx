import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentFamilyMembers } from '@/hooks/useCurrentFamilyMembers'
import { useCurrentMember } from '@/hooks/useCurrentMember'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'

jest.mock('@/hooks/useCurrentMember', () => ({
  useCurrentMember: jest.fn(),
}))

jest.mock('@/contexts/ActiveFamilyContext', () => ({
  useActiveFamily: jest.fn(),
}))

describe('useCurrentFamilyMembers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as unknown as typeof fetch
    localStorage.clear()
    ;(useActiveFamily as jest.Mock).mockReturnValue({
      activeFamilyId: 'family-1',
      setActiveFamilyId: jest.fn(),
      loading: false,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('loads the active family member list around the shared Current Family Member seam', async () => {
    ;(useCurrentMember as jest.Mock).mockReturnValue({
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

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        members: [
          {
            id: 'member-1',
            familyId: 'family-1',
            userId: 'user-1',
            name: 'Parent One',
            email: 'parent@example.com',
            role: 'PARENT',
            avatarUrl: null,
            birthDate: null,
            isActive: true,
          },
          {
            id: 'child-1',
            familyId: 'family-1',
            userId: 'child-auth-1',
            name: 'Child One',
            email: 'child@example.com',
            role: 'CHILD',
            avatarUrl: null,
            birthDate: '2016-02-03',
            isActive: true,
          },
        ],
      }),
    } as Response)

    const { result } = renderHook(() => useCurrentFamilyMembers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isParent).toBe(true)
    expect(result.current.member?.id).toBe('member-1')
    expect(result.current.familyMembers).toEqual([
      expect.objectContaining({
        id: 'member-1',
        familyId: 'family-1',
        role: 'PARENT',
      }),
      expect.objectContaining({
        id: 'child-1',
        familyId: 'family-1',
        role: 'CHILD',
      }),
    ])
  })

  it('includes the kiosk header when loading family members for kiosk viewers', async () => {
    ;(useCurrentMember as jest.Mock).mockReturnValue({
      user: null,
      member: {
        id: 'child-1',
        name: 'Kiosk Child',
        email: null,
        role: 'CHILD',
        familyId: 'family-kiosk',
        avatarUrl: null,
        birthDate: null,
        isActive: true,
      },
      loading: false,
      error: null,
    })

    localStorage.setItem('kioskChildToken', 'kiosk-token')

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ members: [] }),
    } as Response)

    renderHook(() => useCurrentFamilyMembers())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const headers = (global.fetch as jest.Mock).mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['X-Kiosk-Child']).toBe('kiosk-token')
  })
})
