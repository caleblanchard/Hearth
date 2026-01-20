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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const budgets = await getBudgets(familyId, memberId);

    // Map to camelCase for frontend
    const mappedBudgets = budgets.map((budget: any) => ({
      id: budget.id,
      memberId: budget.member_id,
      category: budget.category,
      limitAmount: budget.limit_amount,
      period: budget.period,
      resetDay: budget.reset_day,
      isActive: budget.is_active,
      createdAt: budget.created_at,
      updatedAt: budget.updated_at,
      member: budget.member ? {
        id: budget.member.id,
        name: budget.member.name,
        role: budget.member.role,
      } : null,
      periods: (budget.periods || []).map((period: any) => ({
        id: period.id,
        periodKey: period.period_key,
        periodStart: period.period_start,
        periodEnd: period.period_end,
        spent: period.spent,
        createdAt: period.created_at,
      })),
    }));

    return NextResponse.json({ budgets: mappedBudgets });
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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create budgets for other members
    const body = await request.json();
    const targetMemberId = body.memberId || memberId;
    
    if (targetMemberId !== memberId) {
      const isParent = await isParentInFamily(familyId);
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    // Map request body to match database schema
    const budgetData = {
      memberId: targetMemberId,
      category: body.category,
      limitAmount: body.amount || body.limitAmount, // Support both field names
      period: body.period || 'MONTHLY',
      resetDay: body.resetDay || 0,
      isActive: body.isActive ?? true,
    };

    const budget = await createBudget(familyId, budgetData);

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
