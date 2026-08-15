import { NextResponse } from 'next/server'
import { routeHandler } from '@/lib/api-route'
import { listPendingGraceApprovalRequests } from '@/lib/data/approval-request-lifecycle'

export const GET = routeHandler(
  async () => {
    const requests = await listPendingGraceApprovalRequests({
      forbiddenMessage: 'Only parents can view pending grace requests',
    })
    return { requests }
  },
  { errorMessage: 'Failed to fetch pending grace requests' }
)