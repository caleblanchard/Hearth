import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MealType } from '@prisma/client';

const VALID_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

// Helper function to get Monday of the week for a given date (in UTC)
function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setUTCDate(diff);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');

    // Validate week parameter
    if (!weekParam) {
      return NextResponse.json(
        { error: 'Week parameter is required (format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Parse and validate date
    const weekDate = new Date(weekParam);
    if (isNaN(weekDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Normalize to Monday of that week (already sets UTC hours to 0)
    const monday = getMonday(weekDate);

    // Get meal plan for the week
    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId,
          weekStart: monday,
        },
      },
      include: {
        meals: {
          orderBy: [
            { date: 'asc' },
            { mealType: 'asc' },
          ],
        },
      },
    });

    return NextResponse.json({
      mealPlan,
      weekStart: monday.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, mealType, customName, notes, recipeId } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    if (!mealType) {
      return NextResponse.json(
        { error: 'Meal type is required' },
        { status: 400 }
      );
    }

    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return NextResponse.json(
        { error: 'Invalid meal type. Must be BREAKFAST, LUNCH, DINNER, or SNACK' },
        { status: 400 }
      );
    }

    if (!customName && !recipeId) {
      return NextResponse.json(
        { error: 'Either customName or recipeId must be provided' },
        { status: 400 }
      );
    }

    // Parse meal date
    const mealDate = new Date(date);
    if (isNaN(mealDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    mealDate.setUTCHours(0, 0, 0, 0);

    // Get Monday of that week (getMonday already sets UTC hours to 0)
    const weekStart = getMonday(mealDate);

    // Upsert meal plan for the week
    const mealPlan = await prisma.mealPlan.upsert({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId,
          weekStart,
        },
      },
      create: {
        familyId: session.user.familyId,
        weekStart,
      },
      update: {},
    });

    // Create meal entry
    const entry = await prisma.mealPlanEntry.create({
      data: {
        mealPlanId: mealPlan.id,
        date: mealDate,
        mealType: mealType as MealType,
        customName: customName?.trim() || null,
        notes: notes?.trim() || null,
        recipeId: recipeId || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MEAL_ENTRY_ADDED',
        result: 'SUCCESS',
        metadata: {
          entryId: entry.id,
          mealType: entry.mealType,
          date: entry.date.toISOString(),
        },
      },
    });

    return NextResponse.json(
      {
        entry,
        message: 'Meal entry created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating meal entry:', error);
    return NextResponse.json(
      { error: 'Failed to create meal entry' },
      { status: 500 }
    );
  }
}
