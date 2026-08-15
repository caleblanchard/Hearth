import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api-route';
import { RouteContext } from '@/lib/api-route';
import { approveRewardRedemptionRequest } from '@/lib/data/approval-request-lifecycle';

export const POST = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const result = await approveRewardRedemptionRequest(id, {
      forbiddenMessage: 'Forbidden',
    });

    return {
      success: true,
      redemption: result.redemption,
      message: result.message,
    };
  },
  { errorMessage: 'Failed to approve redemption' }
);