import { NextRequest, NextResponse } from 'next/server'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import {
  createAllowanceScheduleLifecycleSchedule,
  listAllowanceScheduleLifecycleSchedules,
} from '@/lib/data/allowance-schedule-lifecycle'
import type { CreateAllowanceScheduleLifecycleInput } from '@/types/allowance-schedule-lifecycle'

export const GET = routeHandler(
  async () => {
    return listAllowanceScheduleLifecycleSchedules()
  },
  { errorMessage: 'Failed to fetch allowance schedules' }
)

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody<CreateAllowanceScheduleLifecycleInput>(request)
    const schedule = await createAllowanceScheduleLifecycleSchedule(body)

    return NextResponse.json(
      {
        success: true,
        schedule,
        message: 'Allowance schedule created successfully',
      },
      { status: 201 }
    )
  },
  { errorMessage: 'Failed to create allowance schedule' }
)