import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import {
  getScreenTimeLifecycleGraceSettings,
  updateScreenTimeLifecycleGraceSettings,
} from '@/lib/data/screen-time-lifecycle'

export const GET = routeHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const settings = await getScreenTimeLifecycleGraceSettings(
      searchParams.get('memberId')
    )

    return { settings }
  },
  { errorMessage: 'Failed to get grace settings' }
)

export const PATCH = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody(request)
    const settings = await updateScreenTimeLifecycleGraceSettings(body)

    return {
      success: true,
      settings,
      message: 'Grace settings updated successfully',
    }
  },
  { errorMessage: 'Failed to update grace settings' }
)

export const PUT = PATCH