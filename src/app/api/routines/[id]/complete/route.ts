import { NextRequest } from 'next/server';
import { completeRoutineLifecycleRoutine } from '@/lib/data/routine-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import type { RouteContext } from '@/lib/api-route';

export const POST = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const body = await readJsonBody<{ completedItems?: string[]; memberId?: string }>(request).catch(() => ({}));
    const completion = await completeRoutineLifecycleRoutine(id, body);
    return { success: true, completion, message: 'Routine completed successfully' };
  },
  { errorMessage: 'Failed to complete routine', successStatus: 201 }
);