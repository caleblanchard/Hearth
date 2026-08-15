import { NextRequest, NextResponse } from 'next/server'
import { startSickModeLifecycle } from '@/lib/data/sick-mode-lifecycle'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import type { StartSickModeLifecycleInput } from '@/types/sick-mode-lifecycle'

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<StartSickModeLifecycleInput>(request)
  const { instance, settings } = await startSickModeLifecycle(body)

  return NextResponse.json({
    success: true,
    instance,
    settings,
    message: 'Sick mode started successfully',
  }, { status: 201 })
}, { errorMessage: 'Failed to start sick mode' })