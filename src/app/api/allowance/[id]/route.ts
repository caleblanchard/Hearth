import { NextRequest, NextResponse } from 'next/server'
import { readJsonBody, routeHandler, type RouteContext } from '@/lib/api-route'
import {
  deactivateAllowanceScheduleLifecycleSchedule,
  getAllowanceScheduleLifecycleSchedule,
  setAllowanceScheduleLifecyclePaused,
  updateAllowanceScheduleLifecycleSchedule,
} from '@/lib/data/allowance-schedule-lifecycle'
import type { UpdateAllowanceScheduleLifecycleInput } from '@/types/allowance-schedule-lifecycle'

export const GET = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const schedule = await getAllowanceScheduleLifecycleSchedule(id)

    return { schedule }
  },
  { errorMessage: 'Failed to fetch allowance schedule' }
)

export const PUT = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const body = await readJsonBody<UpdateAllowanceScheduleLifecycleInput>(request)
    const schedule = await updateAllowanceScheduleLifecycleSchedule(id, body)

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Allowance schedule updated successfully',
    })
  },
  { errorMessage: 'Failed to update allowance schedule' }
)

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const body = await readJsonBody<{ isPaused?: boolean }>(request)

    if (typeof body.isPaused !== 'boolean') {
      return NextResponse.json({ error: 'isPaused is required' }, { status: 400 })
    }

    const schedule = await setAllowanceScheduleLifecyclePaused(id, body.isPaused)

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Allowance schedule updated successfully',
    })
  },
  { errorMessage: 'Failed to update allowance schedule' }
)

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    await deactivateAllowanceScheduleLifecycleSchedule(id)

    return NextResponse.json({
      success: true,
      message: 'Allowance schedule deleted successfully',
    })
  },
  { errorMessage: 'Failed to delete allowance schedule' }
)