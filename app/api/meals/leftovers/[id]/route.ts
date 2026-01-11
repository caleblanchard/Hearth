import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { markLeftoverUsed, markLeftoverTossed } from '@/lib/data/meals';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
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

    // Get existing leftover
    const { data: leftover } = await supabase
      .from('leftovers')
      .select('family_id')
      .eq('id', params.id)
      .single();

    if (!leftover) {
      return NextResponse.json({ error: 'Leftover not found' }, { status: 404 });
    }

    // Verify leftover belongs to user's family
    if (leftover.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this leftover' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    if (action !== 'used' && action !== 'tossed') {
      return NextResponse.json(
        { error: "Action must be 'used' or 'tossed'" },
        { status: 400 }
      );
    }

    // Mark as used or tossed
    let updatedLeftover;
    if (action === 'used') {
      updatedLeftover = await markLeftoverUsed(params.id, memberId);
    } else {
      updatedLeftover = await markLeftoverTossed(params.id, memberId);
    }

    return NextResponse.json({
      success: true,
      leftover: updatedLeftover,
      message: `Leftover marked as ${action}`,
    });
  } catch (error) {
    logger.error('Update leftover error:', error);
    return NextResponse.json({ error: 'Failed to update leftover' }, { status: 500 });
  }
}
