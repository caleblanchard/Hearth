import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { createGuestInvite } from '@/lib/data/guests';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create guest invites
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can create guest invites' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const invite = await createGuestInvite(familyId, memberId, body);

    return NextResponse.json({
      success: true,
      invite,
      message: 'Guest invite created successfully',
    });
  } catch (error) {
    logger.error('Create guest invite error:', error);
    return NextResponse.json({ error: 'Failed to create guest invite' }, { status: 500 });
  }
}
