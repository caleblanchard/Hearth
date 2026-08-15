import { NextRequest } from 'next/server';
import { getRoutineLifecycleCompletions } from '@/lib/data/routine-lifecycle';
import { routeHandler } from '@/lib/api-route';

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const result = await getRoutineLifecycleCompletions({
    memberId: searchParams.get('memberId'),
    routineId: searchParams.get('routineId'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    limit: searchParams.get('limit'),
    offset: searchParams.get('offset'),
  });
  return result;
}, { errorMessage: 'Failed to fetch completions' });