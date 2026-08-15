import { NextRequest } from 'next/server'
import { routeHandler } from '@/lib/api-route'
import { RouteContext } from '@/lib/api-route'
import { getScreenTimeLifecycleAllowancesForMember } from '@/lib/data/screen-time-lifecycle'

/**
 * GET /api/screentime/allowances/[memberId]
 * Get all allowances for a specific member with remaining time calculations
 */
export const GET = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { memberId } = await params
    return getScreenTimeLifecycleAllowancesForMember(memberId)
  },
  { errorMessage: 'Failed to get allowances' }
)