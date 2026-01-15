import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Handle Supabase email confirmation/invite links
 * This route processes the token_hash from Supabase emails and redirects appropriately
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as 'invite' | 'signup' | 'recovery' | 'email_change' | null
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  if (token_hash && type) {
    const supabase = await createClient()

    // Verify the OTP token
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error('Error verifying OTP:', error)
      // Redirect to an error page or signin with error
      return NextResponse.redirect(`${origin}/auth/signin?error=invalid_token&message=${encodeURIComponent(error.message)}`)
    }

    // For invite type, redirect to password setup page
    if (type === 'invite') {
      // The user needs to set their password
      // Redirect to our set-password page with the next URL
      return NextResponse.redirect(`${origin}/auth/set-password?next=${encodeURIComponent(next)}`)
    }

    // For other types (signup confirmation, recovery), redirect to next
    return NextResponse.redirect(`${origin}${next}`)
  }

  // If no token, redirect to signin
  return NextResponse.redirect(`${origin}/auth/signin`)
}
