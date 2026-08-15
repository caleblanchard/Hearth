import { NextRequest, NextResponse } from 'next/server'
import { readJsonBody, routeHandler, type RouteContext } from '@/lib/api-route'
import { testAutomationLifecycleRule } from '@/lib/data/automation-rule-lifecycle'

export const POST = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const body = await readJsonBody<{ context?: Record<string, unknown> }>(request)

    const result = await testAutomationLifecycleRule(id, body.context)

    return NextResponse.json({
      success: true,
      result,
    })
  },
  { errorMessage: 'Failed to test rule' }
)