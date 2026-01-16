'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export interface SessionData {
  user: User | null
  loading: boolean
}

/**
 * Hook to get the current Supabase auth session
 * Replacement for NextAuth's useSession hook
 */
export function useSupabaseSession() {
  const [session, setSession] = useState<SessionData>({
    user: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession({
        user: session?.user ?? null,
        loading: false,
      })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession({
        user: session?.user ?? null,
        loading: false,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  return session
}

/**
 * Sign out helper function
 * Replacement for NextAuth's signOut
 */
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  
  // Redirect to sign in page
  window.location.href = '/auth/signin'
}
