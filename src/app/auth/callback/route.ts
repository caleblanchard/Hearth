import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/signin?error=oauth_error`)
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const adminClient = createAdminClient()

      // Check if user already has a family membership
      const { data: existingMembership } = await adminClient
        .from('family_members')
        .select('id, family_id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (existingMembership) {
        // User already has a family - go to dashboard
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }

      // Check if there's a pending invitation for this email
      let pendingInvite = null
      if (user.email) {
        const { data } = await (adminClient
          .from('family_members')
          .select('id, invite_token')
          .eq('email', user.email.toLowerCase())
          .eq('invite_status' as any, 'PENDING')
          .maybeSingle() as any)
        pendingInvite = data
      }

      if (pendingInvite?.invite_token) {
        // Link the auth user to the pending member and redirect to accept
        await (adminClient
          .from('family_members')
          .update({
            auth_user_id: user.id,
            invite_status: 'ACTIVE',
            invite_token: null,
            last_login_at: new Date().toISOString(),
          } as any)
          .eq('id', pendingInvite.id) as any)

        // Redirect to dashboard with welcome message
        return NextResponse.redirect(`${origin}/dashboard?welcome=true`)
      }

      // No family membership and no pending invite - redirect to onboarding
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  // Default redirect
  return NextResponse.redirect(`${origin}${redirectTo}`)
}
