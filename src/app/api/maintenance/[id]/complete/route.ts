import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { completeMaintenanceItem } from '@/lib/data/maintenance';
import { logger } from '@/lib/logger';

export async function POST(
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

    // Verify maintenance item exists and belongs to family
    const { data: item } = await supabase
      .from('maintenance_items')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: 'Maintenance item not found' },
        { status: 404 }
      );
    }

    if (item.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { notes } = body;

    // Log completion - all family members can log completions
    const completion = await completeMaintenanceItem(id, memberId, notes);

    return NextResponse.json({
      success: true,
      completion,
      message: 'Maintenance completed successfully',
    });
  } catch (error) {
    logger.error('Complete maintenance error:', error);
    return NextResponse.json({ error: 'Failed to complete maintenance' }, { status: 500 });
  }
}
