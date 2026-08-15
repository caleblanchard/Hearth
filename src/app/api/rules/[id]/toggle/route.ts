import { NextRequest } from 'next/server'
import { routeHandler, type RouteContext } from '@/lib/api-route'
import { toggleAutomationLifecycleRule } from '@/lib/data/automation-rule-lifecycle'

export const PATCH = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const rule = await toggleAutomationLifecycleRule(id)

    return {
      success: true,
      rule,
      message: `Rule ${rule.isEnabled ? 'enabled' : 'disabled'} successfully`,
    }
  },
  { errorMessage: 'Failed to toggle rule' }
)