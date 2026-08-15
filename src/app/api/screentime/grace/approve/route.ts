import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import { decideGraceApprovalRequest } from '@/lib/data/approval-request-lifecycle'

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody<{ graceLogId: string; approved: boolean }>(
      request
    )
    const result = await decideGraceApprovalRequest(body.graceLogId, body.approved, {
      forbiddenMessage: 'Only parents can approve grace requests',
    })

    return {
      success: true,
      graceLog: result.graceLog,
      message: result.message,
    }
  },
  { errorMessage: 'Failed to process grace request' }
)