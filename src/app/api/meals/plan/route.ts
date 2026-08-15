import { NextRequest, NextResponse } from 'next/server';
import {
  createMealPlanLifecycleEntry,
  getMealPlanLifecyclePlan,
} from '@/lib/data/meal-plan-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { CreateMealPlanLifecycleEntryInput } from '@/types/meal-plan-lifecycle';

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const result = await getMealPlanLifecyclePlan({
    week: searchParams.get('week'),
  });
  return result;
}, { errorMessage: 'Failed to fetch meal plan' });

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<CreateMealPlanLifecycleEntryInput>(request);
  const entry = await createMealPlanLifecycleEntry(body);
  return NextResponse.json(
    {
      entry,
      message: 'Meal entry created successfully',
    },
    { status: 201 }
  );
}, { errorMessage: 'Failed to create meal entry' });