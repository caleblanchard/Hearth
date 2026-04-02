import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFamily } from '@/lib/data/families'
import { createMember, setMemberPin } from '@/lib/data/members'

export interface FamilyRegistrationData {
  // Family info
  familyName: string
  timezone?: string
  location?: string | null
  latitude?: number | null
  longitude?: number | null

  // Parent account info
  parentName: string
  email: string
  password: string

  // Optional PIN for kiosk mode
  pin?: string
}

export interface RegistrationResult {
  success: boolean
  familyId?: string
  memberId?: string
  userId?: string
  family?: any
  member?: any
  error?: string
  pendingInvitations?: any[]
}

/**
 * Check if an email has pending invitations to existing families.
 * Returns the pending invitation records if found.
 */
export async function getPendingInvitations(email: string) {
  const adminClient = createAdminClient()
  const { data, error } = await (adminClient
    .from('family_members')
    .select('id, family_id, name, invite_status, invite_token, invite_expires_at, families:families(id, name)')
    .eq('email', email.toLowerCase())
    .eq('invite_status' as any, 'PENDING') as any)

  if (error || !data) return []
  // Filter out expired invitations
  return (data as any[]).filter((inv: any) => {
    if (!inv.invite_expires_at) return true
    return new Date(inv.invite_expires_at) > new Date()
  })
}

/**
 * Register a new family with initial parent account
 * This handles:
 * 1. Checking for pending invitations (returns them instead of creating a new family)
 * 2. Creating a Supabase Auth user
 * 3. Creating a family record
 * 4. Creating a family_member record linked to the auth user
 * 5. Rolling back on partial failure
 * 6. Optionally setting up a PIN for kiosk mode
 */
export async function registerFamily(
  data: FamilyRegistrationData
): Promise<RegistrationResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient() // Service role client to bypass RLS

  try {
    // Step 0: Check for pending invitations before creating a new family
    const pendingInvites = await getPendingInvitations(data.email)
    if (pendingInvites.length > 0) {
      return {
        success: false,
        error: 'PENDING_INVITATIONS',
        pendingInvitations: pendingInvites,
      }
    }

    // Step 1: Verify email is not already an active member of any family
    const emailAvailable = await checkEmailAvailable(data.email)
    if (!emailAvailable) {
      return {
        success: false,
        error: 'This email is already registered. Please use a different email or sign in instead.',
      }
    }

    // Step 2: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.parentName,
        },
      },
    })

    if (authError) {
      // Check if user already exists
      if (authError.message?.toLowerCase().includes('already registered') || 
          authError.message?.toLowerCase().includes('already exists')) {
        return {
          success: false,
          error: 'This email is already registered. Please use a different email or sign in instead.',
        }
      }
      return {
        success: false,
        error: authError.message || 'Failed to create user account',
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Failed to create user account',
      }
    }

    // Step 3: Create family record (using admin client to bypass RLS)
    const { data: family, error: familyError } = await adminClient
      .from('families')
      .insert({
        name: data.familyName,
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: data.location || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      })
      .select()
      .single()

    if (familyError || !family) {
      // Rollback: delete the auth user we just created
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: `Failed to create family: ${familyError?.message}`,
      }
    }

    // Step 4: Create family member linked to auth user (using admin client)
    const { data: member, error: memberError } = await adminClient
      .from('family_members')
      .insert({
        family_id: family.id,
        auth_user_id: authData.user.id,
        name: data.parentName,
        email: data.email,
        role: 'PARENT',
        is_active: true,
        invite_status: 'ACTIVE',
      })
      .select()
      .single()

    if (memberError || !member) {
      // Rollback: delete the family and auth user
      await adminClient.from('families').delete().eq('id', family.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: `Failed to create member: ${memberError?.message}`,
      }
    }

    // Step 5: Set PIN if provided
    if (data.pin) {
      await setMemberPin(member.id, data.pin)
    }

    // Step 6: Check if email confirmation is required
    // If session is null, the user needs to confirm their email before signing in
    if (!authData.session) {
      // User account and family are created, but email confirmation is required
      // Return success but indicate that email confirmation is needed
      return {
        success: true,
        familyId: family.id,
        memberId: member.id,
        userId: authData.user.id,
        family: family,
        member: member,
        error: 'EMAIL_CONFIRMATION_REQUIRED', // Special error code to indicate confirmation needed
      }
    }

    // Step 7: Sign in the user automatically (only if session exists)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      // Sign-in failed, but family and member are already created
      // This shouldn't happen if session exists, but handle it gracefully
      return {
        success: true,
        familyId: family.id,
        memberId: member.id,
        userId: authData.user.id,
        family: family,
        member: member,
        error: signInError.message || 'Account created but sign-in failed. Please sign in manually.',
      }
    }

    return {
      success: true,
      familyId: family.id,
      memberId: member.id,
      userId: authData.user.id,
      family: family,
      member: member,
    }
  } catch (error) {
    console.error('Family registration error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Check if an email is available for registration.
 * Only checks for ACTIVE members (PENDING invites don't block registration).
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  const adminClient = createAdminClient() // Use admin client since user isn't authenticated yet

  // Query family_members table for existing ACTIVE email
  const { data, error } = await (adminClient
    .from('family_members')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('invite_status' as any, 'ACTIVE')
    .limit(1) as any)

  // If there's an error or data exists, email is not available
  return !error && (!data || data.length === 0)
}

/**
 * Validate family registration data
 */
export function validateRegistrationData(
  data: Partial<FamilyRegistrationData>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate family name
  if (!data.familyName || data.familyName.trim().length === 0) {
    errors.push('Family name is required')
  } else if (data.familyName.length > 100) {
    errors.push('Family name must be 100 characters or less')
  }

  // Validate parent name
  if (!data.parentName || data.parentName.trim().length === 0) {
    errors.push('Your name is required')
  } else if (data.parentName.length > 100) {
    errors.push('Name must be 100 characters or less')
  }

  // Validate email
  if (!data.email || data.email.trim().length === 0) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }

  // Validate password
  if (!data.password || data.password.length === 0) {
    errors.push('Password is required')
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters')
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
    errors.push('Password must contain uppercase, lowercase, and numbers')
  }

  // Validate PIN if provided
  if (data.pin) {
    if (!/^\d{4,6}$/.test(data.pin)) {
      errors.push('PIN must be 4-6 digits')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
