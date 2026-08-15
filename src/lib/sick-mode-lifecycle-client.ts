import type {
  EndSickModeLifecycleResult,
  ListSickModeLifecycleInstancesQuery,
  ListSickModeLifecycleInstancesResult,
  StartSickModeLifecycleInput,
  StartSickModeLifecycleResult,
} from '@/types/sick-mode-lifecycle'
import { apiRequest, buildQueryString } from '@/lib/api-client'

export async function fetchSickModeLifecycleStatusClient(
  query: ListSickModeLifecycleInstancesQuery = {}
) {
  return apiRequest<ListSickModeLifecycleInstancesResult>(
    `/api/family/sick-mode/status${buildQueryString({
      memberId: query.memberId,
      includeEnded: query.includeEnded ? 'true' : undefined,
    })}`
  )
}

export async function startSickModeLifecycleClient(input: StartSickModeLifecycleInput) {
  return apiRequest<{ success: true; message: string } & StartSickModeLifecycleResult>(
    '/api/family/sick-mode/start',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function endSickModeLifecycleClient(instanceId: string) {
  return apiRequest<{ success: true; message: string } & EndSickModeLifecycleResult>(
    '/api/family/sick-mode/end',
    {
      method: 'POST',
      body: JSON.stringify({ instanceId }),
    }
  )
}
