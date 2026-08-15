import { NextRequest, NextResponse } from 'next/server';
import {
  deleteMealPlanLifecycleDishAction,
  updateMealPlanLifecycleDishAction,
} from '@/lib/data/meal-plan-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { RouteContext } from '@/lib/api-route';
import type { UpdateMealPlanLifecycleDishInput } from '@/types/meal-plan-lifecycle';

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const body = await readJsonBody<UpdateMealPlanLifecycleDishInput>(request);
    const dish = await updateMealPlanLifecycleDishAction(id, body);
    return {
      success: true,
      dish,
      message: 'Dish updated successfully',
    };
  },
  { errorMessage: 'Failed to update dish' }
);

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    await deleteMealPlanLifecycleDishAction(id);
    return {
      success: true,
      message: 'Dish deleted successfully',
    };
  },
  { errorMessage: 'Failed to delete dish' }
);