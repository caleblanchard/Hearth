import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const invitingMemberId = authContext.activeMemberId;

    if (!familyId || !invitingMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can invite members
    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Unauthorized - Parent access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, birthDate, avatarUrl } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required for inviting adult family members' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if email already exists in family_members
    const { data: existingMember } = await adminClient
      .from('family_members')
      .select('id, invite_status')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingMember) {
      if ((existingMember as any).invite_status === 'PENDING') {
        return NextResponse.json(
          { error: 'An invitation has already been sent to this email address' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'This email is already associated with a family member' },
        { status: 400 }
      );
    }

    // Check if email exists in Supabase Auth
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuthUser) {
      return NextResponse.json(
        { error: 'This email is already registered. The user should sign in and request to join your family.' },
        { status: 400 }
      );
    }

    // Get family details for the invitation email
    const { data: family } = await adminClient
      .from('families')
      .select('name')
      .eq('id', familyId)
      .single();

    // Get inviting member's name
    const { data: invitingMember } = await adminClient
      .from('family_members')
      .select('name')
      .eq('id', invitingMemberId)
      .single();

    // Generate a secure invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    // Create the family member record with PENDING status
    const { data: member, error: memberError } = await adminClient
      .from('family_members')
      .insert({
        family_id: familyId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'PARENT',
        birth_date: birthDate ? new Date(birthDate).toISOString() : null,
        avatar_url: avatarUrl || null,
        is_active: true,
        invite_status: 'PENDING',
        invited_by: invitingMemberId,
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      logger.error('Error creating invited family member:', memberError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Get the app URL for the invitation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Use Supabase's invite user by email functionality
    // This sends an email with a magic link that the user clicks to set their password
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${appUrl}/auth/accept-invite?token=${inviteToken}`,
        data: {
          name: name.trim(),
          invite_token: inviteToken,
          family_id: familyId,
          family_name: family?.name || 'Your Family',
          invited_by: invitingMember?.name || 'A family member',
        },
      }
    );

    if (inviteError) {
      // Rollback the member creation
      await adminClient.from('family_members').delete().eq('id', member.id);

      logger.error('Error sending invitation email:', inviteError);
      return NextResponse.json(
        { error: `Failed to send invitation: ${inviteError.message}` },
        { status: 500 }
      );
    }

    // Audit log - use type casting since the new audit action may not be in types yet
    await (adminClient.from('audit_logs') as any).insert({
      family_id: familyId,
      member_id: invitingMemberId,
      action: 'MEMBER_INVITED',
      entity_type: 'MEMBER',
      entity_id: member.id,
      result: 'SUCCESS',
      metadata: {
        invited_email: email,
        invited_name: name,
        expires_at: expiresAt.toISOString(),
      },
    });

    // Cast member to any since the new columns may not be in types yet
    const memberData = member as any;
    return NextResponse.json({
      success: true,
      member: {
        id: memberData.id,
        name: memberData.name,
        email: memberData.email,
        role: memberData.role,
        inviteStatus: memberData.invite_status,
        inviteSentAt: memberData.invite_sent_at,
        inviteExpiresAt: memberData.invite_expires_at,
      },
      message: `Invitation sent to ${email}. They will receive an email to set up their account.`,
    });
  } catch (error) {
    logger.error('Error inviting family member:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
