import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { updateDish, deleteDish } from '@/lib/data/meals';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/meals/plan/dishes/[id]
 * Update a dish
 */
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

    // Verify dish belongs to family
    const { data: dish } = await supabase
      .from('meal_plan_dishes')
      .select('entry:meal_plan_entries!inner(family_id)')
      .eq('id', params.id)
      .single();

    if (!dish || dish.entry.family_id !== familyId) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    const body = await request.json();
    const updatedDish = await updateDish(params.id, body);

    return NextResponse.json({
      success: true,
      dish: updatedDish,
      message: 'Dish updated successfully',
    });
  } catch (error) {
    logger.error('Update dish error:', error);
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 });
  }
}

/**
 * DELETE /api/meals/plan/dishes/[id]
 * Delete a dish
 */
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

    // Verify dish belongs to family
    const { data: dish } = await supabase
      .from('meal_plan_dishes')
      .select('entry:meal_plan_entries!inner(family_id)')
      .eq('id', params.id)
      .single();

    if (!dish || dish.entry.family_id !== familyId) {
      return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
    }

    await deleteDish(params.id);

    return NextResponse.json({
      success: true,
      message: 'Dish deleted successfully',
    });
  } catch (error) {
    logger.error('Delete dish error:', error);
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 });
  }
}
