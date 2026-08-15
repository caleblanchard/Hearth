import { NextRequest } from 'next/server'
import { routeHandler } from '@/lib/api-route'
import { listAutomationLifecycleExecutions } from '@/lib/data/automation-rule-lifecycle'

export const GET = routeHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    return listAutomationLifecycleExecutions({
      ruleId: searchParams.get('ruleId') || undefined,
      limit: Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)),
      offset: Math.max(parseInt(searchParams.get('offset') || '0', 10), 0),
      success:
        searchParams.get('success') === null
          ? undefined
          : searchParams.get('success') === 'true',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })
  },
  { errorMessage: 'Failed to fetch executions' }
)