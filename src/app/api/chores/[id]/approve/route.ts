import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api-route';
import { RouteContext } from '@/lib/api-route';
import { approveChoreCompletionRequest } from '@/lib/data/approval-request-lifecycle';

export const POST = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id: completionId } = await params;
    const result = await approveChoreCompletionRequest(completionId, {
      forbiddenMessage: 'Forbidden - Parent access required',
    });

    return {
      success: true,
      chore: result.completion,
      creditsAwarded: result.creditsAwarded,
      message: result.message,
    };
  },
  { errorMessage: 'Failed to approve chore' }
);