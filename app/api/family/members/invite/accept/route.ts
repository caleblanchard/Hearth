import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * Complete the invitation acceptance process
 * This is called after the user has verified their email and set their password
 * Links the Supabase auth user to the pending family_member record
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get the current authenticated user (they just clicked the invite link and may have set password)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please complete the sign up process.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    // Find the pending family member with this token
    // Cast to any since invite_* columns may not be in generated types yet
    const { data: pendingMemberData, error: memberError } = await (adminClient
      .from('family_members')
      .select('*, families(name)')
      .eq('invite_token', inviteToken)
      .eq('invite_status', 'PENDING')
      .maybeSingle() as any);

    const pendingMember = pendingMemberData as any;

    if (memberError) {
      logger.error('Error finding pending member:', memberError);
      return NextResponse.json(
        { error: 'Failed to verify invitation' },
        { status: 500 }
      );
    }

    if (!pendingMember) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation. Please ask for a new invitation.' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (pendingMember.invite_expires_at) {
      const expiresAt = new Date(pendingMember.invite_expires_at);
      if (expiresAt < new Date()) {
        // Mark as expired
        await (adminClient
          .from('family_members')
          .update({ invite_status: 'EXPIRED' } as any)
          .eq('id', pendingMember.id) as any);

        return NextResponse.json(
          { error: 'This invitation has expired. Please ask for a new invitation.' },
          { status: 400 }
        );
      }
    }

    // Verify the email matches
    if (pendingMember.email?.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address.' },
        { status: 400 }
      );
    }

    // Link the auth user to the family member record and mark as active
    const { error: updateError } = await (adminClient
      .from('family_members')
      .update({
        auth_user_id: user.id,
        invite_status: 'ACTIVE',
        invite_token: null, // Clear the token after use
        last_login_at: new Date().toISOString(),
      } as any)
      .eq('id', pendingMember.id) as any);

    if (updateError) {
      logger.error('Error linking auth user to family member:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete invitation' },
        { status: 500 }
      );
    }

    // Audit log - cast since new audit action may not be in types
    await (adminClient.from('audit_logs') as any).insert({
      family_id: pendingMember.family_id,
      member_id: pendingMember.id,
      action: 'MEMBER_INVITE_ACCEPTED',
      entity_type: 'MEMBER',
      entity_id: pendingMember.id,
      result: 'SUCCESS',
      metadata: {
        email: user.email,
        auth_user_id: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      memberId: pendingMember.id,
      familyId: pendingMember.family_id,
      familyName: (pendingMember as any).families?.name || 'Your Family',
      message: 'Welcome to the family! Redirecting to your dashboard...',
    });
  } catch (error) {
    logger.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to verify an invite token and get invitation details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Find the pending family member with this token
    // Use separate queries to avoid TypeScript issues with new columns
    const memberResult = await adminClient
      .from('family_members')
      .select('*')
      .eq('invite_token' as any, token)
      .maybeSingle();

    const error = memberResult.error;
    const memberData = memberResult.data as any;

    if (error || !memberData) {
      if (error) {
        logger.error('Error fetching invite details:', error);
      }
      return NextResponse.json(
        { error: error ? 'Failed to verify invitation' : 'Invalid invitation token' },
        { status: error ? 500 : 404 }
      );
    }

    // Get family details
    const { data: familyData } = await adminClient
      .from('families')
      .select('id, name')
      .eq('id', memberData.family_id)
      .single();

    // Get inviter details if invited_by exists
    let inviterData = null;
    if (memberData.invited_by) {
      const { data: inviter } = await adminClient
        .from('family_members')
        .select('name')
        .eq('id', memberData.invited_by)
        .single();
      inviterData = inviter;
    }

    const pendingMember = {
      ...memberData,
      families: familyData,
      inviter: inviterData,
    };

    // Check if already accepted
    if (pendingMember.invite_status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Check if expired or revoked
    if (pendingMember.invite_status === 'EXPIRED') {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    if (pendingMember.invite_status === 'REVOKED') {
      return NextResponse.json(
        { error: 'This invitation has been cancelled' },
        { status: 400 }
      );
    }

    // Check expiration date
    if (pendingMember.invite_expires_at) {
      const expiresAt = new Date(pendingMember.invite_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 400 }
        );
      }
    }

    const family = pendingMember.families as any;
    const inviter = pendingMember.inviter as any;

    return NextResponse.json({
      valid: true,
      invitation: {
        name: pendingMember.name,
        email: pendingMember.email,
        familyName: family?.name || 'A Family',
        invitedBy: inviter?.name || 'A family member',
        expiresAt: pendingMember.invite_expires_at,
      },
    });
  } catch (error) {
    logger.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
