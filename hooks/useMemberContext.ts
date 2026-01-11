'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useSupabaseSession } from './useSupabaseSession'

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
 */
export function useMemberContext(): UseMemberContextResult {
  const { user, loading: authLoading } = useSupabaseSession()
  const [member, setMember] = useState<MemberContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) {
      return // Wait for auth to finish loading
    }

    if (!user) {
      setMember(null)
      setLoading(false)
      return
    }

    async function fetchMember() {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('family_members')
          .select('id, name, email, role, family_id, avatar_url, birth_date, is_active')
          .eq('auth_user_id', user.id)
          .eq('is_active', true)
          .single()

        if (fetchError) {
          console.error('Error fetching member context:', fetchError)
          setError(fetchError.message)
          setMember(null)
        } else {
          setMember(data as MemberContext)
          setError(null)
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
  }, [user, authLoading])

  return {
    user,
    member,
    loading: authLoading || loading,
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
