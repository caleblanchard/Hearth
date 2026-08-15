import { NextRequest } from 'next/server';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import { logScreenTimeLifecycleSession } from '@/lib/data/screen-time-lifecycle';

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<{ minutes?: unknown; screenTimeTypeId?: unknown }>(request);
  const session = await logScreenTimeLifecycleSession(body);
  return { success: true, session, message: 'Screen time logged successfully' };
}, { errorMessage: 'Failed to log screen time' });
