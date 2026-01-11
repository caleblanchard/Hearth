import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getBudgets, createBudget } from '@/lib/data/financial';
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

    const budgets = await getBudgets(familyId, memberId);

    return NextResponse.json({ budgets });
  } catch (error) {
    logger.error('Get budgets error:', error);
    return NextResponse.json({ error: 'Failed to get budgets' }, { status: 500 });
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

    // Only parents can create budgets for other members
    const body = await request.json();
    if (body.memberId && body.memberId !== memberId) {
      const isParent = await isParentInFamily(memberId, familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    const budget = await createBudget(familyId, body);

    return NextResponse.json({
      success: true,
      budget,
      message: 'Budget created successfully',
    });
  } catch (error) {
    logger.error('Create budget error:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}
