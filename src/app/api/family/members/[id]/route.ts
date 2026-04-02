import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcrypt';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { updateFamilyMember, deleteFamilyMember, updateMemberModuleAccess } from '@/lib/data/family';
import { logger } from '@/lib/logger';
import { BCRYPT_ROUNDS } from '@/lib/constants';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Only parents can update members
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify member exists and belongs to family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('id', id)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    const body = await request.json();

    if (id === memberId && (body?.isActive === false)) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    let passwordHash: string | undefined = undefined;
    if (typeof body?.password === 'string' && body.password.trim()) {
      passwordHash = await bcrypt.hash(body.password.trim(), BCRYPT_ROUNDS);
    }

    const { allowedModules, pin, avatarUrl, birthDate, ...memberUpdates } = body || {};

    let pinUpdate: string | null | undefined = undefined;
    if (typeof pin === 'string' && pin.trim()) {
      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(pin.trim())) {
        return NextResponse.json(
          { error: 'PIN must be 4-6 digits' },
          { status: 400 }
        );
      }
      pinUpdate = await bcrypt.hash(pin.trim(), BCRYPT_ROUNDS);
    }

    if (memberUpdates.email) {
      const { data: existingEmail } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', familyId)
        .eq('email', memberUpdates.email)
        .neq('id', id)
        .single();

      if (existingEmail) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    const member = await updateFamilyMember(id, {
      ...memberUpdates,
      avatar_url: avatarUrl,
      birth_date:
        birthDate !== undefined
          ? birthDate
            ? new Date(birthDate).toISOString()
            : null
          : undefined,
      pin: pinUpdate ?? memberUpdates.pin,
      password_hash: passwordHash,
    });

    // Update module access when provided (only for children)
    if (targetMember.role === 'CHILD' && Array.isArray(allowedModules)) {
      const modulesPayload = Array.from(new Set(allowedModules.filter(Boolean))).map(
        (moduleId: string) => ({
          module_id: moduleId,
          has_access: true,
        })
      );
      await updateMemberModuleAccess(id, modulesPayload);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEMBER_UPDATED',
      entity_type: 'MEMBER',
      entity_id: id,
      result: 'SUCCESS',
      metadata: body,
    });

    return NextResponse.json({
      success: true,
      member,
      message: 'Family member updated successfully',
    });
  } catch (error) {
    logger.error('Error updating family member:', error);
    return NextResponse.json({ error: 'Failed to update family member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Only parents can delete members
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify member exists and belongs to family
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('family_id, name, invite_status, role')
      .eq('id', id)
      .single();

    if (!targetMember || targetMember.family_id !== familyId) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    if (id === memberId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    if (targetMember.role === 'PARENT') {
      const { count } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('role', 'PARENT')
        .eq('is_active', true);

      if (count !== null && count <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last parent account' },
          { status: 400 }
        );
      }
    }

    if ((targetMember as any).invite_status === 'PENDING') {
      const adminClient = createAdminClient();
      const { error: cancelError } = await adminClient
        .from('family_members')
        .delete()
        .eq('id', id);

      if (cancelError) {
        logger.error('Error cancelling invite:', cancelError);
        return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
      }

      await (adminClient as any).from('audit_logs').insert({
        family_id: familyId,
        member_id: memberId,
        action: 'MEMBER_DELETED',
        entity_type: 'MEMBER',
        entity_id: id,
        result: 'SUCCESS',
        metadata: { name: targetMember.name },
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully',
      });
    }

    await deleteFamilyMember(id);

    // Audit log
    await (supabase as any).from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEMBER_DELETED',
      entity_type: 'MEMBER',
      entity_id: id,
      result: 'SUCCESS',
      metadata: { name: targetMember.name },
    });

    return NextResponse.json({
      success: true,
      message: 'Family member deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deleting family member:', error);
    return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
  }
}
