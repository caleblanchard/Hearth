import { routeHandler } from '@/lib/api-route';
import { listPendingRewardRedemptionRequests } from '@/lib/data/approval-request-lifecycle';

export const GET = routeHandler(
  async () => {
    const redemptions = await listPendingRewardRedemptionRequests({
      forbiddenMessage: 'Forbidden',
    });
    return { redemptions };
  },
  { errorMessage: 'Failed to fetch redemptions' }
);