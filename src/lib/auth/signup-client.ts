'use client'

import { createClient } from '@/lib/supabase/client'
import type { FamilyRegistrationData } from './signup'

export interface RegistrationResult {
  success: boolean
  familyId?: string
  memberId?: string
  userId?: string
  family?: any
  member?: any
  error?: string
  requiresEmailConfirmation?: boolean
  email?: string
}

/**
 * Client-side wrapper for registerFamily
 * Calls the API route instead of using server-side code
 */
export async function registerFamily(
  data: FamilyRegistrationData
): Promise<RegistrationResult> {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to register family',
      }
    }

    return {
      success: true,
      ...result,
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
 * Client-side wrapper for checkEmailAvailable
 * Uses Supabase client to check email availability
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Query family_members table for existing email
    const { data, error } = await supabase
      .from('family_members')
      .select('id')
      .eq('email', email)
      .limit(1)

    // If there's an error or data exists, email is not available
    return !error && (!data || data.length === 0)
  } catch (error) {
    console.error('Error checking email availability:', error)
    return false
  }
}

/**
 * Validate family registration data (client-side, no server needed)
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
