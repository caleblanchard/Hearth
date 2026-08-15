import { NextRequest } from 'next/server';
import { deleteBudgetLifecycleBudget } from '@/lib/data/budget-lifecycle';
import { routeHandler, type RouteContext } from '@/lib/api-route';

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    await deleteBudgetLifecycleBudget(id);
    return {
      success: true,
      message: 'Budget deleted successfully',
    };
  },
  { errorMessage: 'Failed to delete budget' }
);