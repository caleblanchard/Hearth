import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/onboarding/check
 *
 * Check if the current authenticated user has completed onboarding
 * (i.e., belongs to at least one active family).
 * Also checks for pending invitations that should be shown first.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        onboardingComplete: false,
        setupRequired: true,
      });
    }

    // Check if user has any active family memberships
    const { data: activeMemberships } = await supabase
      .from('family_members')
      .select('id, family_id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true);

    // Filter to only ACTIVE invite_status memberships
    const hasActiveFamily = activeMemberships && activeMemberships.length > 0;

    if (hasActiveFamily) {
      return NextResponse.json({
        onboardingComplete: true,
        setupRequired: false,
      });
    }

    // No active membership — check for pending invitations
    let pendingInvites: any[] = [];
    if (user.email) {
      const { data: invites } = await supabase
        .from('family_members')
        .select('id, family_id, name, families:families(id, name)')
        .eq('email', user.email.toLowerCase())
        .eq('invite_status' as any, 'PENDING');
      pendingInvites = invites || [];
    }

    return NextResponse.json({
      onboardingComplete: false,
      setupRequired: pendingInvites.length === 0,
      pendingInvitations: pendingInvites,
    });
  } catch (error) {
    logger.error('Error checking onboarding status', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
