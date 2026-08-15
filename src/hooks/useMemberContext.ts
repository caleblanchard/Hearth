'use client'

import { useMemo } from 'react'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'
import { useCurrentMember } from './useCurrentMember'
import { useParentAuthorizationContext } from './useParentAuthorizationContext'

export interface MemberContext {
  id: string
  name: string
  email: string | null
  role: 'PARENT' | 'CHILD'
  family_id: string
  avatar_url: string | null
  birth_date: string | null
  is_active: boolean
}

export interface UseMemberContextResult {
  user: any // Supabase Auth user
  member: MemberContext | null
  loading: boolean
  error: string | null
}

/**
 * Hook to get the current user's member record from family_members table
 * This provides access to role, family_id, and other member-specific data
 * that isn't available in Supabase Auth's user object
 *
 * Adapts the current member module and exposes the snake_case shape used
 * by the dashboard chrome (TopBar, DashboardNav, Sidebar)
 */
export function useMemberContext(): UseMemberContextResult {
  const { activeFamilyId, setActiveFamilyId, loading: familyLoading } = useActiveFamily()
  const { user, member, loading, error } = useCurrentMember({
    activeFamilyId,
    familyLoading,
    kioskFallbackName: 'Kiosk Member',
    setActiveFamilyId,
  })

  const mappedMember = useMemo<MemberContext | null>(() => {
    if (!member) {
      return null
    }

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      family_id: member.familyId,
      avatar_url: member.avatarUrl,
      birth_date: member.birthDate,
      is_active: member.isActive,
    }
  }, [member])

  return {
    user,
    member: mappedMember,
    loading,
    error,
  }
}

/**
 * Helper hook to check if current user is a parent
 */
export function useIsParent(): boolean {
  const { isParent } = useParentAuthorizationContext()
  return isParent
}

/**
 * Helper hook to get current family ID
 */
export function useFamilyId(): string | null {
  const { familyId } = useParentAuthorizationContext()
  return familyId
}
