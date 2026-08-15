import { NextRequest, NextResponse } from 'next/server';
import {
  deleteMealPlanLifecycleEntryAction,
  updateMealPlanLifecycleEntryAction,
} from '@/lib/data/meal-plan-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { RouteContext } from '@/lib/api-route';
import type { UpdateMealPlanLifecycleEntryInput } from '@/types/meal-plan-lifecycle';

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const body = await readJsonBody<UpdateMealPlanLifecycleEntryInput>(request);
    const entry = await updateMealPlanLifecycleEntryAction(id, body);

    return {
      success: true,
      entry,
      message: 'Meal entry updated successfully',
    };
  },
  { errorMessage: 'Failed to update meal entry' }
);

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    await deleteMealPlanLifecycleEntryAction(id);

    return {
      success: true,
      message: 'Meal entry deleted successfully',
    };
  },
  { errorMessage: 'Failed to delete meal entry' }
);