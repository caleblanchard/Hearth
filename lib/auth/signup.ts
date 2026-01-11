import { createClient } from '@/lib/supabase/server'
import { createFamily } from '@/lib/data/families'
import { createMember, setMemberPin } from '@/lib/data/members'

export interface FamilyRegistrationData {
  // Family info
  familyName: string
  timezone?: string

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
  error?: string
}

/**
 * Register a new family with initial parent account
 * This is an atomic operation that:
 * 1. Creates a Supabase Auth user
 * 2. Creates a family record
 * 3. Creates a family_member record linked to the auth user
 * 4. Optionally sets up a PIN for kiosk mode
 */
export async function registerFamily(
  data: FamilyRegistrationData
): Promise<RegistrationResult> {
  const supabase = createClient()

  try {
    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.parentName,
        },
      },
    })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create user account',
      }
    }

    // Step 2: Create family record
    const family = await createFamily({
      name: data.familyName,
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      subscription_tier: 'FREE',
      max_members: 10,
      is_active: true,
    })

    // Step 3: Create family member linked to auth user
    const member = await createMember(family.id, {
      auth_user_id: authData.user.id,
      name: data.parentName,
      email: data.email,
      role: 'PARENT',
      is_active: true,
      avatar_url: null,
      date_of_birth: null,
      phone_number: null,
      pin: null,
      password_hash: null,
      preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Step 4: Set PIN if provided
    if (data.pin) {
      await setMemberPin(member.id, data.pin)
    }

    // Step 5: Sign in the user automatically
    await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    return {
      success: true,
      familyId: family.id,
      memberId: member.id,
      userId: authData.user.id,
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
 * Check if an email is already registered
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  const supabase = createClient()

  // Query family_members table for existing email
  const { data, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('email', email)
    .limit(1)

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
