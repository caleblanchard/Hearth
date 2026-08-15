'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'
import { useCurrentFamilyMember } from './useCurrentFamilyMember'
import {
  fetchCurrentFamilyApiMembers,
  getCurrentFamilyKioskChildToken,
  mapCurrentFamilyApiMember,
  type CurrentFamilyMemberRecord,
} from '@/lib/current-family-member-client'

export interface UseCurrentFamilyMembersResult {
  user: ReturnType<typeof useCurrentFamilyMember>['user']
  member: CurrentFamilyMemberRecord | null
  familyMembers: CurrentFamilyMemberRecord[]
  loading: boolean
  error: string | null
  isParent: boolean
  isChild: boolean
  refresh: () => Promise<void>
}

export function useCurrentFamilyMembers(): UseCurrentFamilyMembersResult {
  const { activeFamilyId, setActiveFamilyId, loading: familyLoading } = useActiveFamily()
  const { user, member, loading: memberLoading, error: memberError } = useCurrentFamilyMember({
    activeFamilyId,
    familyLoading,
    kioskFallbackName: 'Current Member',
    setActiveFamilyId,
  })
  const [familyMembers, setFamilyMembers] = useState<CurrentFamilyMemberRecord[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!member) {
      setFamilyMembers([])
      setMembersError(null)
      setMembersLoading(false)
      return
    }

    setMembersLoading(true)

    try {
      const records = await fetchCurrentFamilyApiMembers(user?.id ?? null)
      setFamilyMembers(records.map((record) => mapCurrentFamilyApiMember(record)))
      setMembersError(null)
    } catch (error) {
      setFamilyMembers([])
      setMembersError(
        error instanceof Error ? error.message : 'Failed to load current family members'
      )
    } finally {
      setMembersLoading(false)
    }
  }, [member, user?.id])

  useEffect(() => {
    if (memberLoading || familyLoading) {
      return
    }

    if (!member && !getCurrentFamilyKioskChildToken()) {
      setFamilyMembers([])
      setMembersError(null)
      setMembersLoading(false)
      return
    }

    void refresh()
  }, [familyLoading, member, memberLoading, refresh])

  const error = memberError ?? membersError

  return useMemo(
    () => ({
      user,
      member,
      familyMembers,
      loading: familyLoading || memberLoading || membersLoading,
      error,
      isParent: member?.role === 'PARENT',
      isChild: member?.role === 'CHILD',
      refresh,
    }),
    [error, familyLoading, familyMembers, member, memberLoading, membersLoading, refresh, user]
  )
}
