import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import { RouteContext } from '@/lib/api-route'
import {
  archiveScreenTimeLifecycleType,
  getScreenTimeLifecycleType,
  updateScreenTimeLifecycleType,
} from '@/lib/data/screen-time-lifecycle'

/**
 * GET /api/screentime/types/[id]
 * Get a specific screen time type
 */
export const GET = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    return { type: await getScreenTimeLifecycleType(id) }
  },
  { errorMessage: 'Failed to fetch screen time type' }
)

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const body = await readJsonBody(request)
    const type = await updateScreenTimeLifecycleType(id, body)

    return {
      success: true,
      type,
      message: 'Screen time type updated successfully',
    }
  },
  { errorMessage: 'Failed to update screen time type' }
)

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    await archiveScreenTimeLifecycleType(id)

    return {
      success: true,
      message: 'Screen time type deleted successfully',
    }
  },
  { errorMessage: 'Failed to delete screen time type' }
)