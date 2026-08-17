import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentMember } from '@/hooks/useCurrentMember'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { createClient } from '@/lib/supabase/client'
import {
  createMockSupabaseClient,
  type SupabaseQueryBuilder,
} from '@/lib/test-utils/supabase-mock'

jest.mock('@/hooks/useSupabaseSession', () => ({
  useSupabaseSession: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockResponse = (data: unknown, ok = true, status = ok ? 200 : 500) =>
  Promise.resolve({ ok, status, json: async () => data } as Response)

describe('useCurrentMember', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns the active family membership for an authenticated user', async () => {
    const mockSupabase = createMockSupabaseClient()
    const query = mockSupabase.from('family_members') as unknown as SupabaseQueryBuilder
    ;(query.single as jest.Mock).mockResolvedValue({
      data: {
        id: 'member-2',
        name: 'Parent Two',
        email: 'parent2@example.com',
        role: 'PARENT',
        family_id: 'family-2',
        avatar_url: 'avatar.png',
        birth_date: null,
        is_active: true,
      },
      error: null,
    })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-2', email: 'parent2@example.com' },
      loading: false,
    })

    const { result } = renderHook(() => useCurrentMember({ activeFamilyId: 'family-2' }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.member).toEqual({
      id: 'member-2',
      name: 'Parent Two',
      email: 'parent2@example.com',
      role: 'PARENT',
      familyId: 'family-2',
      avatarUrl: 'avatar.png',
      birthDate: null,
      isActive: true,
    })
    expect(result.current.isParent).toBe(true)
    expect(result.current.isChild).toBe(false)
  })

  it('falls back to the first active membership and sets the active family', async () => {
    const firstMember = {
      id: 'member-1',
      name: 'Parent One',
      email: 'parent@example.com',
      role: 'PARENT',
      family_id: 'family-1',
      avatar_url: null,
      birth_date: null,
      is_active: true,
    }
    const mockSupabase = createMockSupabaseClient()
    const query = mockSupabase.from('family_members') as unknown as SupabaseQueryBuilder
    ;(query.limit as jest.Mock).mockResolvedValue({ data: [firstMember], error: null })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'parent@example.com' },
      loading: false,
    })

    const setActiveFamilyId = jest.fn()
    const { result } = renderHook(() => useCurrentMember({ setActiveFamilyId }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.member?.familyId).toBe('family-1')
    expect(setActiveFamilyId).toHaveBeenCalledWith('family-1')
  })

  it('resolves kiosk members from the role and family endpoints', async () => {
    localStorage.setItem('kioskChildToken', 'kiosk-token')
    ;(useSupabaseSession as jest.Mock).mockReturnValue({ user: null, loading: false })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          role: 'CHILD',
          memberId: 'child-1',
          familyId: 'family-kiosk',
          authUserId: 'auth-child-1',
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          members: [
            {
              id: 'child-1',
              familyId: 'family-kiosk',
              userId: 'auth-child-1',
              name: 'Kiosk Child',
              email: 'child@example.com',
              role: 'CHILD',
              birthDate: '2015-04-11',
              avatarUrl: null,
              isActive: true,
            },
          ],
        }),
      )

    const setActiveFamilyId = jest.fn()
    const { result } = renderHook(() => useCurrentMember({ setActiveFamilyId }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/user/role')
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toHaveProperty(
      'X-Kiosk-Child',
      'kiosk-token',
    )
    expect(result.current.member?.name).toBe('Kiosk Child')
    expect(result.current.isParent).toBe(false)
    expect(result.current.isChild).toBe(true)
    expect(setActiveFamilyId).toHaveBeenCalledWith('family-kiosk')
  })

  it('synthesizes a kiosk member when the family list does not include the resolved member', async () => {
    localStorage.setItem('kioskChildToken', 'kiosk-token')
    ;(useSupabaseSession as jest.Mock).mockReturnValue({ user: null, loading: false })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          role: 'CHILD',
          memberId: 'child-2',
          familyId: 'family-kiosk',
        }),
      )
      .mockResolvedValueOnce(mockResponse({ members: [] }))

    const { result } = renderHook(() =>
      useCurrentMember({ kioskFallbackName: 'Kiosk Member' }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.member).toEqual({
      id: 'child-2',
      name: 'Kiosk Member',
      email: null,
      role: 'CHILD',
      familyId: 'family-kiosk',
      avatarUrl: null,
      birthDate: null,
      isActive: true,
    })
  })

  it('surfaces database errors from authenticated member resolution', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const mockSupabase = createMockSupabaseClient()
    const query = mockSupabase.from('family_members') as unknown as SupabaseQueryBuilder
    ;(query.single as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'membership lookup failed' },
    })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-3', email: 'parent3@example.com' },
      loading: false,
    })

    const { result } = renderHook(() => useCurrentMember({ activeFamilyId: 'family-3' }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.member).toBeNull()
    expect(result.current.error).toBe('membership lookup failed')
    consoleError.mockRestore()
  })
})
