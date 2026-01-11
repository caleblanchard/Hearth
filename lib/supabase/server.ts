import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * This client automatically handles cookie-based sessions
 * 
 * NOTE: In Next.js 15+, cookies() returns a Promise and must be awaited
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle the error when called from a Server Component
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle the error when called from a Server Component
          }
        },
      },
    }
  )
}

/**
 * Get the current authenticated user and their family context
 * Returns null if not authenticated
 */
export async function getAuthContext() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return null

  // Get all family memberships for this user
  const { data: memberships } = await supabase
    .from('family_members')
    .select(`
      id,
      family_id,
      name,
      role,
      avatar_url,
      families:families(
        id,
        name,
        timezone,
        settings
      )
    `)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)

  return {
    user,
    memberships: memberships || [],
    defaultFamilyId: memberships?.[0]?.family_id || null,
    defaultMemberId: memberships?.[0]?.id || null,
  }
}

/**
 * Get the current user's member record for a specific family
 */
export async function getMemberInFamily(familyId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('family_members')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .single()

  return member
}

/**
 * Check if current user is a parent in the specified family
 */
export async function isParentInFamily(familyId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: member } = await supabase
    .from('family_members')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .single()

  return member?.role === 'PARENT'
}

/**
 * Get the current user's role in a specific family
 */
export async function getRoleInFamily(familyId: string) {
  const member = await getMemberInFamily(familyId)
  return member?.role || null
}
