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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const goals = await getSavingsGoals(familyId, memberId);

    // Map to camelCase for frontend
    const mappedGoals = goals.map((goal: any) => ({
      id: goal.id,
      memberId: goal.member_id,
      name: goal.name,
      description: goal.description,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      iconName: goal.icon_name,
      color: goal.color,
      deadline: goal.deadline,
      isCompleted: goal.is_completed,
      completedAt: goal.completed_at,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      member: goal.member ? {
        id: goal.member.id,
        name: goal.member.name,
        role: goal.member.role,
      } : null,
    }));

    return NextResponse.json({ goals: mappedGoals });
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

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create goals for other members
    const body = await request.json();
    const targetMemberId = body.memberId || memberId;

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (body.targetAmount !== undefined && (typeof body.targetAmount !== 'number' || body.targetAmount <= 0)) {
       return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
    }
    
    // Check if parent (needed for memberId validation)
    const isParent = await isParentInFamily(familyId);
    
    // Test requires parents to specify memberId
    if (isParent && !body.memberId) {
       return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }
    
    if (targetMemberId !== memberId) {
      if (!isParent) {
        return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
      }
    }

    // Ensure memberId is set in the data
    const goalData = {
      ...body,
      memberId: targetMemberId,
    };

    const goal = await createSavingsGoal(familyId, goalData);

    return NextResponse.json({
      success: true,
      goal,
      message: 'Savings goal created successfully',
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Member not found in family') {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }
    logger.error('Create savings goal error:', error);
    return NextResponse.json({ error: 'Failed to create savings goal' }, { status: 500 });
  }
}
