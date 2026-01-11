import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateMealPlanEntry, deleteMealPlanEntry } from '@/lib/data/meals';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get existing entry
    const { data: entry } = await supabase
      .from('meal_plan_entries')
      .select('*, meal_plan:meal_plans!inner(family_id)')
      .eq('id', params.id)
      .single();

    if (!entry) {
      return NextResponse.json({ error: 'Meal entry not found' }, { status: 404 });
    }

    // Verify entry belongs to user's family
    if (entry.meal_plan.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this meal entry' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updatedEntry = await updateMealPlanEntry(params.id, body);

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
      message: 'Meal entry updated successfully',
    });
  } catch (error) {
    logger.error('Update meal plan entry error:', error);
    return NextResponse.json({ error: 'Failed to update meal entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get existing entry
    const { data: entry } = await supabase
      .from('meal_plan_entries')
      .select('*, meal_plan:meal_plans!inner(family_id)')
      .eq('id', params.id)
      .single();

    if (!entry) {
      return NextResponse.json({ error: 'Meal entry not found' }, { status: 404 });
    }

    // Verify entry belongs to user's family
    if (entry.meal_plan.family_id !== familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this meal entry' },
        { status: 403 }
      );
    }

    await deleteMealPlanEntry(params.id);

    return NextResponse.json({
      success: true,
      message: 'Meal entry deleted successfully',
    });
  } catch (error) {
    logger.error('Delete meal plan entry error:', error);
    return NextResponse.json({ error: 'Failed to delete meal entry' }, { status: 500 });
  }
}
