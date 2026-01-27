import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
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

    // Verify user has access to this family
    const membership = authContext.memberships.find(m => m.family_id === familyId);
    if (!membership) {
       return NextResponse.json({ error: 'Unauthorized access to family' }, { status: 403 });
    }
    
    const isChild = membership.role === 'CHILD';
    const currentMemberId = authContext.activeMemberId || membership.id;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    let targetMemberId = searchParams.get('memberId') || undefined;
    
    // Force child to only see own completions
    if (isChild) {
      targetMemberId = currentMemberId;
    }

    const routineId = searchParams.get('routineId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    let query = supabase
      .from('routine_completions')
      .select(`
        *,
        routine:routines!inner(family_id),
        member:family_members!member_id(id, name)
      `, { count: 'exact' })
      .eq('routine.family_id', familyId)
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (targetMemberId) {
      query = query.eq('member_id', targetMemberId);
    }
    if (routineId) {
      query = query.eq('routine_id', routineId);
    }
    if (startDateStr) {
      query = query.gte('date', new Date(startDateStr));
    }
    if (endDateStr) {
      query = query.lte('date', new Date(endDateStr));
    }

    const { data: completions, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({ 
      completions,
      pagination: {
        total: count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error('Fetch routine completions error:', error);
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
  }
}
