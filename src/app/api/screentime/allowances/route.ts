import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import {
  listScreenTimeLifecycleAllowances,
  saveScreenTimeLifecycleAllowance,
} from '@/lib/data/screen-time-lifecycle'

export const GET = routeHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    return listScreenTimeLifecycleAllowances({
      memberId: searchParams.get('memberId'),
      screenTimeTypeId: searchParams.get('screenTimeTypeId'),
    })
  },
  { errorMessage: 'Failed to fetch allowances' }
)

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody(request)
    const allowance = await saveScreenTimeLifecycleAllowance(body)

    return {
      success: true,
      allowance,
      message: 'Allowance saved successfully',
    }
  },
  { errorMessage: 'Failed to save allowance' }
)