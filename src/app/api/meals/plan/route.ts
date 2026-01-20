import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { 
  getMealPlanWithEntries, 
  getOrCreateMealPlan, 
  createMealPlanEntry,
  addDishToMealEntry 
} from '@/lib/data/meals';
import { logger } from '@/lib/logger';

const VALID_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
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
    const weekDate = new Date(weekParam + 'T00:00:00'); // Parse as local date
    if (isNaN(weekDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Use the week parameter directly as the week start
    // The frontend already calculates the correct week start based on family settings
    const weekStart = weekParam;

    // Use data module
    const mealPlan = await getMealPlanWithEntries(familyId, weekStart);

    // Map 'entries' to 'meals' for frontend compatibility with camelCase
    const response = mealPlan ? {
      id: mealPlan.id,
      weekStart: mealPlan.week_start,
      meals: (mealPlan.entries || []).map((entry: any) => ({
        id: entry.id,
        date: entry.date,
        mealType: entry.meal_type,
        customName: entry.custom_name,
        notes: entry.notes,
        recipeId: entry.recipe_id,
        dishes: (entry.dishes || []).map((dish: any) => ({
          id: dish.id,
          dishName: dish.dish_name,
          recipeId: dish.recipe_id,
          sortOrder: dish.sort_order,
          recipe: dish.recipe ? {
            id: dish.recipe.id,
            name: dish.recipe.name,
            prepTimeMinutes: dish.recipe.prep_time_minutes,
            cookTimeMinutes: dish.recipe.cook_time_minutes,
          } : null,
        })),
      }))
    } : null;

    return NextResponse.json({
      mealPlan: response,
      weekStart: weekStart,
    });
  } catch (error) {
    logger.error('Error fetching meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const { date, mealType, customName, notes, recipeId, dishes } = body;

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

    // Validate that either legacy fields or dishes array is provided
    if (!customName && !recipeId && (!dishes || dishes.length === 0)) {
      return NextResponse.json(
        { error: 'Either customName, recipeId, or dishes array must be provided' },
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

    // Get start of week
    const weekStart = new Date(mealDate);
    const day = weekStart.getUTCDay();
    const diff = weekStart.getUTCDate() - day + (day === 0 ? -6 : 1);
    weekStart.setUTCDate(diff);

    // Create meal plan for the week
    const mealPlan = await getOrCreateMealPlan(
      familyId,
      weekStart.toISOString().split('T')[0]
    );

    // Create meal entry
    const entry = await createMealPlanEntry({
      meal_plan_id: mealPlan.id,
      date: mealDate.toISOString().split('T')[0],
      meal_type: mealType,
      custom_name: customName?.trim() || null,
      notes: notes?.trim() || null,
      recipe_id: recipeId || null,
    });

    // Create dishes if provided
    if (dishes && dishes.length > 0) {
      for (let i = 0; i < dishes.length; i++) {
        const dish = dishes[i];
        let dishName = dish.dishName;

        // If recipeId provided, fetch recipe name
        if (dish.recipeId && !dishName) {
          const { data: recipe } = await supabase
            .from('recipes')
            .select('name, family_id')
            .eq('id', dish.recipeId)
            .eq('family_id', familyId)
            .single();

          if (recipe) {
            dishName = recipe.name;
          }
        }

        if (dishName) {
          await addDishToMealEntry({
            meal_entry_id: entry.id,
            recipe_id: dish.recipeId || null,
            dish_name: dishName,
            sort_order: i,
          });
        }
      }
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'MEAL_ENTRY_ADDED',
      entity_type: 'MEAL_PLAN',
      entity_id: entry.id,
      result: 'SUCCESS',
      metadata: {
        entryId: entry.id,
        mealType: entry.meal_type,
        date: entry.date,
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
    logger.error('Error creating meal entry:', error);
    return NextResponse.json(
      { error: 'Failed to create meal entry' },
      { status: 500 }
    );
  }
}
