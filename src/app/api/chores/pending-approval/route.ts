import { routeHandler } from '@/lib/api-route';
import { listPendingChoreCompletionRequests } from '@/lib/data/approval-request-lifecycle';

export const dynamic = 'force-dynamic';

export const GET = routeHandler(
  async () => {
    const pendingChores = await listPendingChoreCompletionRequests({
      forbiddenMessage: 'Forbidden - Parent access required',
    });

    return { chores: pendingChores };
  },
  { errorMessage: 'Failed to fetch pending approvals' }
);