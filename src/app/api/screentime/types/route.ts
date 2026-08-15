import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import {
  createScreenTimeLifecycleType,
  listScreenTimeLifecycleTypes,
} from '@/lib/data/screen-time-lifecycle'

/**
 * GET /api/screentime/types
 * List all screen time types for the family
 */
export const GET = routeHandler(async () => listScreenTimeLifecycleTypes(), {
  errorMessage: 'Failed to fetch screen time types',
})

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody(request)
    const type = await createScreenTimeLifecycleType(body)

    return {
      success: true,
      type,
      message: 'Screen time type created successfully',
    }
  },
  { errorMessage: 'Failed to create screen time type' }
)