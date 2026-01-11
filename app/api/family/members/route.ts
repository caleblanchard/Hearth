import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can add members
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, birthDate, avatarUrl } = body;

    // Validation
    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    if (role === 'PARENT' && !email) {
      return NextResponse.json({ error: 'Email is required for parent accounts' }, { status: 400 });
    }

    // Check if email already exists (for parent accounts)
    if (email) {
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Create new member via Supabase Auth for PARENT, or just family_members for CHILD
    // Note: For full auth integration, parent accounts should be created via Supabase Auth signup
    // For now, we'll just create the family member record
    const { data: member, error } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        name,
        email: email || null,
        role,
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

    // Audit log
    await supabase.from('audit_logs').insert({
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
