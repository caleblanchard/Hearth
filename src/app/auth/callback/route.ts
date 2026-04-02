import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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

      // Check if user already has an active family membership
      const { data: existingMemberships } = await adminClient
        .from('family_members')
        .select('id, family_id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .eq('invite_status' as any, 'ACTIVE')

      if (existingMemberships && existingMemberships.length > 0) {
        // User already has a family - go to dashboard
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }

      // Check for ALL pending invitations for this email and auto-accept them
      if (user.email) {
        const { data: pendingInvites } = await (adminClient
          .from('family_members')
          .select('id, invite_token, invite_expires_at')
          .eq('email', user.email.toLowerCase())
          .eq('invite_status' as any, 'PENDING') as any)

        if (pendingInvites && pendingInvites.length > 0) {
          let acceptedCount = 0

          for (const invite of pendingInvites as any[]) {
            // Validate the invite token exists and invitation hasn't expired
            if (!invite.invite_token) continue
            if (invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date()) {
              // Mark expired invitations
              await (adminClient
                .from('family_members')
                .update({ invite_status: 'EXPIRED' } as any)
                .eq('id', invite.id) as any)
              continue
            }

            // Atomically accept: only update if still PENDING (prevents race condition)
            const { data: updated, error: updateError } = await (adminClient
              .from('family_members')
              .update({
                auth_user_id: user.id,
                invite_status: 'ACTIVE',
                invite_token: null,
                last_login_at: new Date().toISOString(),
              } as any)
              .eq('id', invite.id)
              .eq('invite_status' as any, 'PENDING')
              .select('id') as any)

            if (!updateError && updated && (updated as any[]).length > 0) {
              acceptedCount++
            }
          }

          if (acceptedCount > 0) {
            // Redirect to dashboard with welcome message
            return NextResponse.redirect(`${origin}/dashboard?welcome=true`)
          }
        }
      }

      // No family membership and no pending invite - redirect to onboarding
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  // Default redirect
  return NextResponse.redirect(`${origin}${redirectTo}`)
}
