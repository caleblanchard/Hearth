import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const currentMemberId = authContext.activeMemberId;

    if (!familyId || !currentMemberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const queryMemberId = searchParams.get('memberId');
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const memberId = queryMemberId || currentMemberId;

    // If viewing another member's history, verify permissions
    if (memberId !== currentMemberId) {
      const isParent = await isParentInFamily( familyId);
      if (!isParent) {
        return NextResponse.json(
          { error: 'Cannot view other members history' },
          { status: 403 }
        );
      }

      const member = useMockDb
        ? await (dbMock as any).familyMember.findUnique({
            where: { id: memberId },
            select: { familyId: true },
          })
        : (await supabase
            .from('family_members')
            .select('family_id')
            .eq('id', memberId)
            .single()).data;

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
      if ((member.family_id ?? member.familyId) !== familyId) {
        return NextResponse.json(
          { error: 'Cannot view history from other families' },
          { status: 403 }
        );
      }
    }

    const logs = useMockDb
      ? await (dbMock as any).gracePeriodLog.findMany({
          where: { memberId },
          include: { approvedBy: { select: { id: true, name: true } } },
          orderBy: { requestedAt: 'desc' },
          take: limit,
          skip: offset,
        })
      : (await supabase
          .from('grace_period_logs')
          .select(
            `
            *,
            approvedBy:family_members!grace_period_logs_approved_by_id_fkey(id, name)
          `
          )
          .eq('member_id', memberId)
          .order('requested_at', { ascending: false })
          .range(offset, offset + limit - 1)).data;

    const count = useMockDb
      ? await (dbMock as any).gracePeriodLog.count({ where: { memberId } })
      : (await supabase
          .from('grace_period_logs')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', memberId)).count;

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + (logs?.length || 0) < (count || 0),
      },
    });
  } catch (error) {
    logger.error('Get grace history error:', error);
    return NextResponse.json(
      { error: 'Failed to get grace history' },
      { status: 500 }
    );
  }
}
