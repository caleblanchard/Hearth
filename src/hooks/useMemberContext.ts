'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useSupabaseSession } from './useSupabaseSession'
import { useActiveFamily } from '@/contexts/ActiveFamilyContext'

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
 * Now supports multi-family: uses the active family from ActiveFamilyContext
 */
export function useMemberContext(): UseMemberContextResult {
  const { user, loading: authLoading } = useSupabaseSession()
  const { activeFamilyId, setActiveFamilyId, loading: familyLoading } = useActiveFamily()
  const [member, setMember] = useState<MemberContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const kioskChild = typeof window !== 'undefined' ? localStorage.getItem('kioskChildToken') : null

  useEffect(() => {
    if (authLoading || familyLoading) {
      return // Wait for auth and family context to finish loading
    }

    if (!user && !kioskChild) {
      setMember(null)
      setLoading(false)
      return
    }

    async function fetchMember() {
      try {
        const headers: Record<string, string> = {}
        if (kioskChild) {
          headers['X-Kiosk-Child'] = kioskChild
        }

        // Kiosk child sessions fetch via API endpoints that honor kiosk headers
        if (kioskChild) {
          const [roleRes, membersRes] = await Promise.all([
            fetch('/api/user/role', { headers }),
            fetch('/api/family/members', { headers }),
          ])

          if (!roleRes.ok) {
            throw new Error(`Failed to fetch kiosk role: ${roleRes.status}`)
          }
          if (!membersRes.ok) {
            throw new Error(`Failed to fetch kiosk members: ${membersRes.status}`)
          }

          const roleData = await roleRes.json()
          const membersData = await membersRes.json()

          const current = membersData.members?.find(
            (m: any) => m.id === roleData.memberId
          )

          if (current) {
            const mapped: MemberContext = {
              id: current.id,
              name: current.name,
              email: current.email ?? null,
              role: roleData.role || current.role,
              family_id: roleData.familyId || current.familyId,
              avatar_url: current.avatarUrl ?? null,
              birth_date: current.birthDate ?? null,
              is_active: current.isActive,
            }
            setMember(mapped)
            setActiveFamilyId(roleData.familyId || current.familyId)
            setError(null)
          } else {
            // Fallback: synthesize minimal kiosk member so dependent UI can render
            if (roleData.memberId && roleData.familyId) {
              setMember({
                id: roleData.memberId,
                name: 'Kiosk Member',
                email: null,
                role: roleData.role || 'CHILD',
                family_id: roleData.familyId,
                avatar_url: null,
                birth_date: null,
                is_active: true,
              })
              setActiveFamilyId(roleData.familyId)
              setError(null)
            } else {
              setMember(null)
              setError('No kiosk member found')
            }
          }
          return
        }

        const supabase = createClient()

        // If we have an active family ID, fetch that specific membership
        if (activeFamilyId) {
          const { data, error: fetchError } = await supabase
            .from('family_members')
            .select('id, name, email, role, family_id, avatar_url, birth_date, is_active')
            .eq('auth_user_id', user?.id || '')
            .eq('family_id', activeFamilyId)
            .eq('is_active', true)
            .single()

          if (fetchError) {
            console.error('Error fetching member context for active family:', fetchError)
            setError(fetchError.message)
            setMember(null)
          } else {
            setMember(data as MemberContext)
            setError(null)
          }
        } else {
          // No active family set - get all families and use the first one
          const { data: allMembers, error: fetchError } = await supabase
            .from('family_members')
            .select('id, name, email, role, family_id, avatar_url, birth_date, is_active')
            .eq('auth_user_id', user?.id || '')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)

          if (fetchError) {
            console.error('Error fetching member context:', fetchError)
            setError(fetchError.message)
            setMember(null)
          } else if (allMembers && allMembers.length > 0) {
            const firstMember = allMembers[0] as MemberContext
            setMember(firstMember)
            // Set this as the active family
            setActiveFamilyId(firstMember.family_id)
            setError(null)
          } else {
            setMember(null)
            setError(null)
          }
        }
      } catch (err) {
        console.error('Error fetching member context:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setMember(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMember()
  }, [user, authLoading, activeFamilyId, familyLoading, setActiveFamilyId, kioskChild])

  return {
    user,
    member,
    loading: authLoading || familyLoading || loading,
    error,
  }
}

/**
 * Helper hook to check if current user is a parent
 */
export function useIsParent(): boolean {
  const { member } = useMemberContext()
  return member?.role === 'PARENT'
}

/**
 * Helper hook to get current family ID
 */
export function useFamilyId(): string | null {
  const { member } = useMemberContext()
  return member?.family_id || null
}
