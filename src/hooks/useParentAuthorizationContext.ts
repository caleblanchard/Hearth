'use client'

import { useMemo } from 'react'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'
import { useCurrentFamilyMember } from './useCurrentFamilyMember'

export interface UseParentAuthorizationContextResult {
  user: ReturnType<typeof useCurrentFamilyMember>['user']
  memberId: string | null
  familyId: string | null
  role: 'PARENT' | 'CHILD' | null
  isParent: boolean
  isChild: boolean
  canManageFamily: boolean
  loading: boolean
  error: string | null
}

export function useParentAuthorizationContext(): UseParentAuthorizationContextResult {
  const { activeFamilyId, setActiveFamilyId, loading: familyLoading } = useActiveFamily()
  const { user, member, loading, error } = useCurrentFamilyMember({
    activeFamilyId,
    familyLoading,
    kioskFallbackName: 'Kiosk Member',
    setActiveFamilyId,
  })

  return useMemo(
    () => ({
      user,
      memberId: member?.id ?? null,
      familyId: member?.familyId ?? null,
      role: member?.role ?? null,
      isParent: member?.role === 'PARENT',
      isChild: member?.role === 'CHILD',
      canManageFamily: member?.role === 'PARENT',
      loading,
      error,
    }),
    [error, loading, member, user]
  )
}
