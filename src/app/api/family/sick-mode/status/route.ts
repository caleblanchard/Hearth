import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getSickModeStatus } from '@/lib/data/health';
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

    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId');
    const includeEnded = searchParams.get('includeEnded') === 'true';

    const supabase = await createClient();
    let query = supabase
      .from('sick_mode_instances')
      .select('*, member:family_members!sick_mode_instances_member_id_fkey(id, name)')
      .eq('family_id', familyId);

    if (targetMemberId) {
      // Verify member exists in family
      const { data: member } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', targetMemberId)
        .eq('family_id', familyId)
        .single();
      
      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      query = query.eq('member_id', targetMemberId);
    }

    if (!includeEnded) {
      query = query.eq('is_active', true);
    }

    const { data: instances, error } = await query.order('started_at', { ascending: false });

    if (error) {
      logger.error('Get sick mode status error:', error);
      return NextResponse.json({ error: 'Failed to get sick mode status' }, { status: 500 });
    }

    // For backward compatibility or if specific member requested, verify member existence if not found?
    // But if we return list, we return { instances: [...] }
    
    return NextResponse.json({ instances: instances || [] });
  } catch (error) {
    logger.error('Get sick mode status error:', error);
    return NextResponse.json({ error: 'Failed to get sick mode status' }, { status: 500 });
  }
}
