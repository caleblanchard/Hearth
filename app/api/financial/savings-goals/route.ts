import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getSavingsGoals, createSavingsGoal } from '@/lib/data/financial';
import { logger } from '@/lib/logger';

export async function GET() {
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

    const goals = await getSavingsGoals(familyId, memberId);

    return NextResponse.json({ goals });
  } catch (error) {
    logger.error('Get savings goals error:', error);
    return NextResponse.json({ error: 'Failed to get savings goals' }, { status: 500 });
  }
}

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

    // Only parents can create goals for other members
    const body = await request.json();
    if (body.memberId && body.memberId !== memberId) {
      const isParent = await isParentInFamily(memberId, familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    const goal = await createSavingsGoal(familyId, body);

    return NextResponse.json({
      success: true,
      goal,
      message: 'Savings goal created successfully',
    });
  } catch (error) {
    logger.error('Create savings goal error:', error);
    return NextResponse.json({ error: 'Failed to create savings goal' }, { status: 500 });
  }
}
