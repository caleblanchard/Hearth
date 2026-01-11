import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { addDishToMealEntry } from '@/lib/data/meals';
import { logger } from '@/lib/logger';

/**
 * POST /api/meals/plan/dishes
 * Add a dish to an existing meal entry
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const { mealEntryId, recipeId, dishName } = body;

    // Validation
    if (!mealEntryId) {
      return NextResponse.json(
        { error: 'Meal entry ID is required' },
        { status: 400 }
      );
    }

    if (!recipeId && !dishName) {
      return NextResponse.json(
        { error: 'Either recipeId or dishName is required' },
        { status: 400 }
      );
    }

    const dish = await addDishToMealEntry(mealEntryId, { recipeId, dishName });

    return NextResponse.json({
      success: true,
      dish,
      message: 'Dish added to meal successfully',
    });
  } catch (error) {
    logger.error('Add dish error:', error);
    return NextResponse.json({ error: 'Failed to add dish' }, { status: 500 });
  }
}
