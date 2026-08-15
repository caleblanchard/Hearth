import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentFamilyMember } from '@/hooks/useCurrentFamilyMember'
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

describe('useCurrentFamilyMember', () => {
  const originalFetch = global.fetch
  const mockResponse = (data: unknown, ok = true, status = ok ? 200 : 500) =>
    Promise.resolve({
      ok,
      status,
      json: async () => data,
    } as Response)

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    global.fetch = jest.fn() as unknown as typeof fetch
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

    const { result } = renderHook(() =>
      useCurrentFamilyMember({ activeFamilyId: 'family-2' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
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
  })

  it('falls back to the first active membership and sets the active family when none is selected', async () => {
    const mockSupabase = createMockSupabaseClient()
    const query = mockSupabase.from('family_members') as unknown as SupabaseQueryBuilder
    const setActiveFamilyId = jest.fn()

    ;(query.limit as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'member-1',
          name: 'Parent One',
          email: 'parent1@example.com',
          role: 'PARENT',
          family_id: 'family-1',
          avatar_url: null,
          birth_date: '1988-01-01',
          is_active: true,
        },
      ],
      error: null,
    })

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'parent1@example.com' },
      loading: false,
    })

    const { result } = renderHook(() =>
      useCurrentFamilyMember({ setActiveFamilyId })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.member?.familyId).toBe('family-1')
    expect(setActiveFamilyId).toHaveBeenCalledWith('family-1')
  })

  it('resolves kiosk members from the role and family endpoints', async () => {
    const setActiveFamilyId = jest.fn()

    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    localStorage.setItem('kioskChildToken', 'kiosk-token')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          role: 'CHILD',
          memberId: 'child-1',
          familyId: 'family-kiosk',
          authUserId: 'auth-child-1',
        })
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
        })
      )

    const { result } = renderHook(() =>
      useCurrentFamilyMember({ setActiveFamilyId })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const firstCallHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers as Headers

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/user/role')
    expect(firstCallHeaders.get('X-Kiosk-Child')).toBe('kiosk-token')
    expect(result.current.member?.name).toBe('Kiosk Child')
    expect(result.current.member?.familyId).toBe('family-kiosk')
    expect(setActiveFamilyId).toHaveBeenCalledWith('family-kiosk')
  })

  it('synthesizes a kiosk member when the family list does not include the resolved member', async () => {
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    localStorage.setItem('kioskChildToken', 'kiosk-token')

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockResponse({
          role: 'CHILD',
          memberId: 'child-2',
          familyId: 'family-kiosk',
        })
      )
      .mockResolvedValueOnce(mockResponse({ members: [] }))

    const { result } = renderHook(() =>
      useCurrentFamilyMember({ kioskFallbackName: 'Kiosk Member' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
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
    const mockSupabase = createMockSupabaseClient()
    const query = mockSupabase.from('family_members') as unknown as SupabaseQueryBuilder
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    ;(query.single as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'membership lookup failed' },
    })

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(useSupabaseSession as jest.Mock).mockReturnValue({
      user: { id: 'user-3', email: 'parent3@example.com' },
      loading: false,
    })

    const { result } = renderHook(() =>
      useCurrentFamilyMember({ activeFamilyId: 'family-3' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.member).toBeNull()
    expect(result.current.error).toBe('membership lookup failed')

    consoleErrorSpy.mockRestore()
  })
})
