import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { startSickMode } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId: targetMemberId, healthEventId, notes } = body;

    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const instance = await startSickMode(targetMemberId, memberId, notes);

    return NextResponse.json({
      success: true,
      instance,
      message: 'Sick mode started successfully',
    });
  } catch (error) {
    logger.error('Start sick mode error:', error);
    return NextResponse.json({ error: 'Failed to start sick mode' }, { status: 500 });
  }
}
