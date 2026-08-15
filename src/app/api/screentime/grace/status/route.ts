import { NextRequest } from 'next/server'
import { routeHandler } from '@/lib/api-route'
import { getScreenTimeLifecycleGraceStatus } from '@/lib/data/screen-time-lifecycle'

export const GET = routeHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const status = await getScreenTimeLifecycleGraceStatus(
      searchParams.get('memberId')
    )

    return { status }
  },
  { errorMessage: 'Failed to get grace status' }
)