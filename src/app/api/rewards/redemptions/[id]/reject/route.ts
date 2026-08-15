import { NextRequest } from 'next/server';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import { RouteContext } from '@/lib/api-route';
import { rejectRewardRedemptionRequest } from '@/lib/data/approval-request-lifecycle';

export const POST = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const { reason } = await readJsonBody<{ reason?: string }>(request);
    const result = await rejectRewardRedemptionRequest(id, reason, {
      forbiddenMessage: 'Forbidden',
    });

    return {
      success: true,
      redemption: result.redemption,
      message: result.message,
    };
  },
  { errorMessage: 'Failed to reject redemption' }
);