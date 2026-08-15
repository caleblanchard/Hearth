import { NextRequest, NextResponse } from 'next/server';
import { createMealPlanLifecycleDish } from '@/lib/data/meal-plan-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { CreateMealPlanLifecycleDishInput } from '@/types/meal-plan-lifecycle';

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<CreateMealPlanLifecycleDishInput>(request);
  const dish = await createMealPlanLifecycleDish(body);
  return NextResponse.json(
    {
      success: true,
      dish,
      message: 'Dish added to meal successfully',
    },
    { status: 201 }
  );
}, { errorMessage: 'Failed to create dish' });