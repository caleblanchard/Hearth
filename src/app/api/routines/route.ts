import { NextRequest, NextResponse } from 'next/server';
import {
  createRoutineLifecycleRoutine,
  getRoutineLifecycleRoutines,
} from '@/lib/data/routine-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const routines = await getRoutineLifecycleRoutines({
    type: searchParams.get('type'),
    assignedTo: searchParams.get('assignedTo'),
  });
  return { routines };
}, { errorMessage: 'Failed to fetch routines' });

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const routine = await createRoutineLifecycleRoutine(body);
  return NextResponse.json(
    { routine, message: 'Routine created successfully' },
    { status: 201 }
  );
}, { errorMessage: 'Failed to create routine' });