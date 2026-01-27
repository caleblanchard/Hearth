import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { hashSecret } from '@/lib/kiosk-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { headers as nextHeaders } from 'next/headers'

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
 * 
 * Multi-family support: Reads x-active-family-id header and validates access
 */
export async function getAuthContext() {
  const testSession = (globalThis as Record<string, unknown>).__TEST_SESSION__ as
    | { user?: { id?: string; familyId?: string; role?: string; name?: string; familyName?: string } }
    | null
    | undefined
  if (testSession?.user?.id && testSession.user.familyId) {
    return {
      user: testSession.user,
      memberships: [
        {
          id: testSession.user.id,
          family_id: testSession.user.familyId,
          name: testSession.user.name || '',
          role: testSession.user.role,
          families: {
            id: testSession.user.familyId,
            name: testSession.user.familyName,
          },
        },
      ],
      defaultFamilyId: testSession.user.familyId,
      defaultMemberId: testSession.user.id,
      activeFamilyId: testSession.user.familyId,
      activeMemberId: testSession.user.id,
    }
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
  // Fallback: kiosk child session via header or cookie
  try {
    const headersList = await nextHeaders()
    const childToken =
      headersList.get('x-kiosk-child') ||
      headersList.get('cookie')?.split(';').find((c) => c.trim().startsWith('kiosk_child_token='))?.split('=')[1]
    if (childToken) {
      const service = createServiceClient()
      const tokenHash = hashSecret(childToken)
      const { data: session } = await service
        .from('kiosk_child_sessions')
          .select('id,member_id,expires_at,kiosk_device_secrets(family_id)')
          .eq('session_token_hash', tokenHash)
          .is('ended_at', null)
          .maybeSingle()
        if (session) {
          const expiresAt = new Date(session.expires_at)
          if (expiresAt.getTime() > Date.now()) {
            return {
              user: {
                id: session.member_id,
                role: 'CHILD',
                familyId: (session as any).kiosk_device_secrets.family_id,
                name: 'Kiosk User',
              },
              memberships: [
                {
                  id: session.member_id,
                  family_id: (session as any).kiosk_device_secrets.family_id,
                  name: 'Kiosk User',
                  role: 'CHILD',
                  families: {
                    id: (session as any).kiosk_device_secrets.family_id,
                    name: '',
                  },
                },
              ],
              defaultFamilyId: (session as any).kiosk_device_secrets.family_id,
              defaultMemberId: session.member_id,
              activeFamilyId: (session as any).kiosk_device_secrets.family_id,
              activeMemberId: session.member_id,
            }
          }
        }
      }
    } catch (_) {
      // ignore and continue unauthenticated
    }
    return null
  }

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

  // Read active family ID from request header (if provided)
  let activeFamilyId: string | null = null;
  let activeMemberId: string | null = null;
  
  try {
    const headersList = await nextHeaders();
    const requestedFamilyId = headersList.get('x-active-family-id');
    
    if (requestedFamilyId && memberships) {
      // Verify user has access to this family
      const membership = memberships.find(m => m.family_id === requestedFamilyId);
      if (membership) {
        activeFamilyId = requestedFamilyId;
        activeMemberId = membership.id;
      }
    }
  } catch (error) {
    // Header reading failed - not a problem, will use default
  }

  return {
    user,
    memberships: memberships || [],
    defaultFamilyId: memberships?.[0]?.family_id || null,
    defaultMemberId: memberships?.[0]?.id || null,
    // Active family (from header) or falls back to default
    activeFamilyId: activeFamilyId || memberships?.[0]?.family_id || null,
    activeMemberId: activeMemberId || memberships?.[0]?.id || null,
  }
}

/**
 * Get the current user's member record for a specific family
 */
export async function getMemberInFamily(familyId: string) {
  const testSession = (globalThis as Record<string, unknown>).__TEST_SESSION__ as any
  if (testSession?.user?.id) {
    if (testSession.user.familyId === familyId) {
      return {
        id: testSession.user.id,
        family_id: familyId,
        role: testSession.user.role,
        auth_user_id: testSession.user.id,
        is_active: true,
        name: testSession.user.name || 'Test User',
      } as any
    }
  }

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
  const testSession = (globalThis as Record<string, unknown>).__TEST_SESSION__ as any
  if (testSession?.user?.id) {
    if (testSession.user.familyId === familyId) {
      return testSession.user.role === 'PARENT'
    }
  }

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
