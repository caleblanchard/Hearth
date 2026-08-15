import { NextRequest, NextResponse } from 'next/server';
import {
  deleteRoutineLifecycleRoutine,
  getRoutineLifecycleRoutine,
  updateRoutineLifecycleRoutine,
} from '@/lib/data/routine-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { RouteContext } from '@/lib/api-route';

export const GET = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const routine = await getRoutineLifecycleRoutine(id);
    return { routine };
  },
  { errorMessage: 'Failed to fetch routine' }
);

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const body = await readJsonBody<Record<string, unknown>>(request);
    const routine = await updateRoutineLifecycleRoutine(id, body);
    return NextResponse.json({
      success: true,
      routine,
      message: 'Routine updated successfully',
    });
  },
  { errorMessage: 'Failed to update routine' }
);

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    await deleteRoutineLifecycleRoutine(id);
    return NextResponse.json({
      success: true,
      message: 'Routine deleted successfully',
    });
  },
  { errorMessage: 'Failed to delete routine' }
);