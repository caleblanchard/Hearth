import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import { processApprovalRequests } from '@/lib/data/approval-request-lifecycle';

type BulkDecisionBody = {
  itemIds?: unknown;
};

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<BulkDecisionBody>(request);
  const { itemIds } = body;

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: 'itemIds must be a non-empty array' }, { status: 400 });
  }

  return processApprovalRequests({
    decision: 'DENY',
    itemIds,
  });
}, { errorMessage: 'Failed to deny items' });