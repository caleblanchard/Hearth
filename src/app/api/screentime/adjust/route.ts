import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import { adjustScreenTimeLifecycleBalance } from '@/lib/data/screen-time-lifecycle'

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody(request)
    const adjustment = await adjustScreenTimeLifecycleBalance(body)

    return {
      success: true,
      ...adjustment,
      message: `Adjusted screen time by ${adjustment.amountMinutes} minutes`,
    }
  },
  { errorMessage: 'Failed to adjust allowance' }
)