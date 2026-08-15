import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import { requestScreenTimeLifecycleGrace } from '@/lib/data/screen-time-lifecycle'
import type { RequestScreenTimeLifecycleGraceInput } from '@/types/screen-time-lifecycle'

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody<RequestScreenTimeLifecycleGraceInput>(request)
    const result = await requestScreenTimeLifecycleGrace(body)

    return {
      success: true,
      ...result,
      message: result.pendingApproval
        ? 'Grace period request sent to parents for approval'
        : 'Grace period applied successfully',
    }
  },
  { errorMessage: 'Failed to request grace period' }
)