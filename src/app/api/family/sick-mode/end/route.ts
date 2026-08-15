import { NextRequest } from 'next/server';
import { endSickModeLifecycle } from '@/lib/data/sick-mode-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<{ instanceId?: string }>(request);
  const result = await endSickModeLifecycle(body.instanceId ?? '');

  return {
    success: true,
    instance: result.instance,
    message: 'Sick mode ended successfully',
  };
}, { errorMessage: 'Failed to end sick mode' });