import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRoutineCompletions } from '@/lib/data/routines';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || undefined;
    const routineId = searchParams.get('routineId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    let query = supabase
      .from('routine_completions')
      .select(`
        *,
        routine:routines!inner(family_id),
        member:family_members!member_id(id, name)
      `)
      .eq('routine.family_id', familyId)
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (memberId) {
      query = query.eq('member_id', memberId);
    }
    if (routineId) {
      query = query.eq('routine_id', routineId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: completions, error } = await query;

    if (error) throw error;

    return NextResponse.json({ completions });
  } catch (error) {
    logger.error('Fetch routine completions error:', error);
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
  }
}
