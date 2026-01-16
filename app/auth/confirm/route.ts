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
    if (type === 'invite') {
      const redirectUrl = new URL(`${origin}/auth/set-password`)
      redirectUrl.searchParams.set('next', next)
      redirectUrl.searchParams.set('token_hash', token_hash)
      redirectUrl.searchParams.set('type', type)

      try {
        const nextUrl = new URL(next, origin)
        const inviteToken = nextUrl.searchParams.get('token')
        if (inviteToken) {
          redirectUrl.searchParams.set('inviteToken', inviteToken)
        }
      } catch (parseError) {
        // Ignore invalid next URL and continue without invite token
      }

      return NextResponse.redirect(redirectUrl.toString())
    }

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

    // For other types (signup confirmation, recovery), redirect to next
    return NextResponse.redirect(`${origin}${next}`)
  }

  // If no token, redirect to signin
  return NextResponse.redirect(`${origin}/auth/signin`)
}
