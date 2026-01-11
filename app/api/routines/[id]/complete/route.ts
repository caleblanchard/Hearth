import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { completeRoutine } from '@/lib/data/routines';
import { logger } from '@/lib/logger';

export async function POST(
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

    // Get the routine
    const { data: routine } = await supabase
      .from('routines')
      .select('family_id, member_id')
      .eq('id', params.id)
      .single();

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to complete this routine' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notes, completedBy } = body;

    const result = await completeRoutine(params.id, completedBy || memberId, notes || null);

    return NextResponse.json({
      success: true,
      completion: result.completion,
      message: 'Routine completed successfully',
    });
  } catch (error) {
    logger.error('Complete routine error:', error);
    return NextResponse.json({ error: 'Failed to complete routine' }, { status: 500 });
  }
}
