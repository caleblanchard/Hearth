import { routeHandler } from '@/lib/api-route';
import { getApprovalRequestStats } from '@/lib/data/approval-request-lifecycle';

/**
 * GET /api/approvals/stats
 *
 * Returns statistics about pending approvals
 */
export const GET = routeHandler(async () => getApprovalRequestStats(), {
  errorMessage: 'Failed to fetch approval statistics',
});