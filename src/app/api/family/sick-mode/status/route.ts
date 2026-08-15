import { NextRequest } from 'next/server';
import { listSickModeLifecycleInstances } from '@/lib/data/sick-mode-lifecycle';
import { routeHandler } from '@/lib/api-route';

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  return listSickModeLifecycleInstances({
    memberId: searchParams.get('memberId'),
    includeEnded: searchParams.get('includeEnded') === 'true',
  });
}, { errorMessage: 'Failed to get sick mode status' });