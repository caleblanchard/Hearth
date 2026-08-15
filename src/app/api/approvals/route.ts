import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api-route';
import { listApprovalRequests } from '@/lib/data/approval-request-lifecycle';

const APPROVAL_TYPES = ['ALL', 'CHORE_COMPLETION', 'REWARD_REDEMPTION', 'SHOPPING_ITEM'] as const;

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type');
  const memberIdFilter = searchParams.get('memberId');
  const type = APPROVAL_TYPES.find((candidate) => candidate === typeFilter);

  return listApprovalRequests({
    type: type ?? null,
    memberId: memberIdFilter,
  });
}, { errorMessage: 'Failed to fetch approvals' });