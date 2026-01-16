import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { POST as inviteMember } from '@/app/api/family/members/invite/route';
import { logger } from '@/lib/logger';
import { BCRYPT_ROUNDS } from '@/lib/constants';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;

    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Fetch all family members
    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching family members:', error);
      return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
    }

    // Map to camelCase
    const mappedMembers = members.map((member: any) => ({
      id: member.id,
      familyId: member.family_id,
      userId: member.auth_user_id,
      name: member.name,
      email: member.email,
      role: member.role,
      birthDate: member.birth_date,
      avatarUrl: member.avatar_url,
      isActive: member.is_active,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
    }));

    console.log('[API] /api/family/members - Found', mappedMembers.length, 'members');
    return NextResponse.json({
      success: true,
      members: mappedMembers,
    });
  } catch (error) {
    logger.error('Error fetching family members:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can add members
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, birthDate, avatarUrl, pin, allowedModules } = body;

    // Validation
    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim() : '';

    if (role === 'PARENT' && !normalizedEmail) {
      return NextResponse.json({ error: 'Email is required for parent accounts' }, { status: 400 });
    }

    const isChildInvite = role === 'CHILD' && normalizedEmail.length > 0;

    if (isChildInvite) {
      const inviteRequest = new Request(
        new URL('/api/family/members/invite', request.url),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: normalizedEmail,
            role: 'CHILD',
            pin,
            allowedModules,
            birthDate,
            avatarUrl,
          }),
        }
      );
      return inviteMember(inviteRequest);
    }

    // Check if email already exists (for parent accounts)
    if (normalizedEmail) {
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('email', normalizedEmail.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    if (role === 'CHILD') {
      const pinValue = typeof pin === 'string' ? pin.trim() : '';
      if (!pinValue) {
        return NextResponse.json(
          { error: 'PIN is required for child accounts' },
          { status: 400 }
        );
      }
      if (!/^\d{4,6}$/.test(pinValue)) {
        return NextResponse.json(
          { error: 'PIN must be 4-6 digits' },
          { status: 400 }
        );
      }
    }

    const pinHash =
      role === 'CHILD' && typeof pin === 'string'
        ? await bcrypt.hash(pin.trim(), BCRYPT_ROUNDS)
        : null;

    const moduleIds = Array.isArray(allowedModules)
      ? [...new Set(allowedModules.filter(Boolean))]
      : [];

    // Create new member via Supabase Auth for PARENT, or just family_members for CHILD
    // Note: For full auth integration, parent accounts should be created via Supabase Auth signup
    // For now, we'll just create the family member record
    const { data: member, error } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        name,
        email: normalizedEmail ? normalizedEmail.toLowerCase() : null,
        role,
        pin: pinHash,
        birth_date: birthDate ? new Date(birthDate).toISOString() : null,
        avatar_url: avatarUrl || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating family member:', error);
      return NextResponse.json({ error: 'Failed to create family member' }, { status: 500 });
    }

    if (role === 'CHILD' && moduleIds.length > 0) {
      const { error: modulesError } = await supabase
        .from('member_module_access')
        .insert(
          moduleIds.map((moduleId) => ({
            member_id: member.id,
            module_id: moduleId,
            has_access: true,
          }))
        );

      if (modulesError) {
        logger.error('Error setting member module access:', modulesError);
        await supabase.from('family_members').delete().eq('id', member.id);
        return NextResponse.json(
          { error: 'Failed to set member module access' },
          { status: 500 }
        );
      }
    }

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEMBER_CREATED',
      entity_type: 'MEMBER',
      entity_id: member.id,
      result: 'SUCCESS',
      metadata: { name, role },
    });

    return NextResponse.json({
      success: true,
      member,
      message: 'Family member created successfully',
    });
  } catch (error) {
    logger.error('Error creating family member:', error);
    return NextResponse.json({ error: 'Failed to create family member' }, { status: 500 });
  }
}
