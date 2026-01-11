import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { updateRewardItem } from '@/lib/data/credits';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only parents can update rewards
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const updates = await request.json();

    // Verify reward belongs to user's family
    const { data: reward } = await supabase
      .from('reward_items')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (reward.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update reward
    const updatedReward = await updateRewardItem(id, updates);

    return NextResponse.json({
      success: true,
      reward: updatedReward,
      message: 'Reward updated successfully',
    });
  } catch (error) {
    logger.error('Update reward error:', error);
    return NextResponse.json(
      { error: 'Failed to update reward' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only parents can delete rewards
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Verify reward belongs to user's family
    const { data: reward } = await supabase
      .from('reward_items')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (reward.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Soft delete (set status to INACTIVE)
    const { error } = await supabase
      .from('reward_items')
      .update({ status: 'INACTIVE' })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting reward:', error);
      return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reward deleted successfully',
    });
  } catch (error) {
    logger.error('Delete reward error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reward' },
      { status: 500 }
    );
  }
}
