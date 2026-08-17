import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  EndSickModeLifecycleResult,
  ListSickModeLifecycleInstancesQuery,
  ListSickModeLifecycleInstancesResult,
  StartSickModeLifecycleInput,
  StartSickModeLifecycleResult,
} from '@/types/sick-mode-lifecycle'

const statusClient = createLifecycleClient({ basePath: '/api/family/sick-mode/status' })

const startClient = createLifecycleClient({ basePath: '/api/family/sick-mode/start' })

const endClient = createLifecycleClient({ basePath: '/api/family/sick-mode/end' })

export function fetchSickModeLifecycleStatusClient(
  query: ListSickModeLifecycleInstancesQuery = {},
): Promise<ListSickModeLifecycleInstancesResult> {
  return statusClient.action<ListSickModeLifecycleInstancesResult>('', 'GET', undefined, undefined, {
    memberId: query.memberId,
    includeEnded: query.includeEnded ? 'true' : undefined,
  })
}

export function startSickModeLifecycleClient(
  input: StartSickModeLifecycleInput,
): Promise<{ success: true; message: string } & StartSickModeLifecycleResult> {
  return startClient.action<{ success: true; message: string } & StartSickModeLifecycleResult>(
    '',
    'POST',
    input,
  )
}

export function endSickModeLifecycleClient(
  instanceId: string,
): Promise<{ success: true; message: string } & EndSickModeLifecycleResult> {
  return endClient.action<{ success: true; message: string } & EndSickModeLifecycleResult>('', 'POST', {
    instanceId,
  })
}
