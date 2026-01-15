import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const INVITE_EXPIRY_DAYS = 7;

export async function POST(request: Request) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const resendingMemberId = authContext.activeMemberId;

    if (!familyId || !resendingMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can resend invites
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Unauthorized - Parent access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Find the pending member
    const { data: pendingMember, error: memberError } = await adminClient
      .from('family_members')
      .select('*')
      .eq('id', memberId)
      .eq('family_id', familyId)
      .eq('invite_status', 'PENDING')
      .single();

    if (memberError || !pendingMember) {
      return NextResponse.json(
        { error: 'Pending invitation not found' },
        { status: 404 }
      );
    }

    // Get family details
    const { data: family } = await adminClient
      .from('families')
      .select('name')
      .eq('id', familyId)
      .single();

    // Get resending member's name
    const { data: resendingMember } = await adminClient
      .from('family_members')
      .select('name')
      .eq('id', resendingMemberId)
      .single();

    // Generate a new invite token
    const newInviteToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + INVITE_EXPIRY_DAYS);

    // Update the member record with new token and expiry
    // Cast to any since invite_* columns may not be in generated types yet
    await (adminClient
      .from('family_members')
      .update({
        invite_token: newInviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: newExpiresAt.toISOString(),
      } as any)
      .eq('id', memberId) as any);

    // Get the app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Resend the Supabase invitation
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      pendingMember.email!,
      {
        redirectTo: `${appUrl}/auth/accept-invite?token=${newInviteToken}`,
        data: {
          name: pendingMember.name,
          invite_token: newInviteToken,
          family_id: familyId,
          family_name: family?.name || 'Your Family',
          invited_by: resendingMember?.name || 'A family member',
        },
      }
    );

    if (inviteError) {
      // If user already exists in auth, we need a different approach
      if (inviteError.message?.includes('already been registered')) {
        // User already has a Supabase auth account but hasn't accepted
        // In this case, we can't re-invite via Supabase, but the token is updated
        // They can use the password reset flow or we need to handle this differently
        logger.warn('User already registered in Supabase Auth: ' + pendingMember.email);
        return NextResponse.json(
          {
            error: 'This email already has an account. The user should sign in and check for family invitations, or use the password reset if needed.'
          },
          { status: 400 }
        );
      }

      logger.error('Error resending invitation:', inviteError);
      return NextResponse.json(
        { error: `Failed to resend invitation: ${inviteError.message}` },
        { status: 500 }
      );
    }

    // Audit log - cast since new audit action may not be in types
    await (adminClient.from('audit_logs') as any).insert({
      family_id: familyId,
      member_id: resendingMemberId,
      action: 'MEMBER_INVITE_RESENT',
      entity_type: 'MEMBER',
      entity_id: memberId,
      result: 'SUCCESS',
      metadata: {
        invited_email: pendingMember.email,
        invited_name: pendingMember.name,
        expires_at: newExpiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${pendingMember.email}`,
    });
  } catch (error) {
    logger.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
