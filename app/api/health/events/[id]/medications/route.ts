import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { addMedicationToHealthEvent } from '@/lib/data/health';
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

    // Verify health event exists and belongs to family
    const { data: event } = await supabase
      .from('health_events')
      .select('member:family_members!inner(family_id)')
      .eq('id', id)
      .single();

    if (!event || event.member.family_id !== familyId) {
      return NextResponse.json({ error: 'Health event not found' }, { status: 404 });
    }

    const body = await request.json();
    const medication = await addMedicationToHealthEvent(id, memberId, body);

    return NextResponse.json({
      success: true,
      medication,
      message: 'Medication recorded successfully',
    });
  } catch (error) {
    logger.error('Add health event medication error:', error);
    return NextResponse.json({ error: 'Failed to add medication' }, { status: 500 });
  }
}
