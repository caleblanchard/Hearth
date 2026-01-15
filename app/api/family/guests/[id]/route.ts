import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { revokeGuestInvite } from '@/lib/data/guests';
import { logger } from '@/lib/logger';

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

    // Only parents can revoke invites
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can revoke guest invites' },
        { status: 403 }
      );
    }

    // Verify invite exists and belongs to family
    const { data: existingInvite } = await supabase
      .from('guest_invites')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!existingInvite) {
      return NextResponse.json(
        { error: 'Guest invite not found' },
        { status: 404 }
      );
    }

    if (existingInvite.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await revokeGuestInvite(id);

    return NextResponse.json({
      success: true,
      message: 'Guest invite revoked successfully',
    });
  } catch (error) {
    logger.error('Revoke guest invite error:', error);
    return NextResponse.json({ error: 'Failed to revoke guest invite' }, { status: 500 });
  }
}
