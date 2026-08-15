import { NextRequest, NextResponse } from 'next/server';
import {
  createBudgetLifecycleBudget,
  getBudgetLifecycleBudgets,
} from '@/lib/data/budget-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';

export const GET = routeHandler(async () => {
  const budgets = await getBudgetLifecycleBudgets();
  return { budgets };
}, { errorMessage: 'Failed to get budgets' });

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const budget = await createBudgetLifecycleBudget(body);
  return NextResponse.json(
    {
      success: true,
      budget,
      message: 'Budget created successfully',
    },
    { status: 201 }
  );
}, { errorMessage: 'Failed to create budget' });