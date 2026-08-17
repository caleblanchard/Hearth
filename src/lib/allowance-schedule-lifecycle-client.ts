import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  AllowanceScheduleLifecycleScheduleRecord,
  CreateAllowanceScheduleLifecycleInput,
  UpdateAllowanceScheduleLifecycleInput,
} from '@/types/allowance-schedule-lifecycle'

const scheduleClient = createLifecycleClient<AllowanceScheduleLifecycleScheduleRecord>({
  basePath: '/api/allowance',
  itemKey: 'schedule',
  listKey: 'schedules',
  updateMethod: 'PUT',
})

export function fetchAllowanceScheduleLifecycleSchedulesClient(): Promise<
  AllowanceScheduleLifecycleScheduleRecord[]
> {
  return scheduleClient.list()
}

export function createAllowanceScheduleLifecycleScheduleClient(
  input: CreateAllowanceScheduleLifecycleInput,
): Promise<AllowanceScheduleLifecycleScheduleRecord> {
  return scheduleClient.create(input)
}

export function updateAllowanceScheduleLifecycleScheduleClient(
  scheduleId: string,
  input: UpdateAllowanceScheduleLifecycleInput,
): Promise<AllowanceScheduleLifecycleScheduleRecord> {
  return scheduleClient.update(scheduleId, input)
}

export function setAllowanceScheduleLifecyclePausedClient(
  scheduleId: string,
  isPaused: boolean,
): Promise<AllowanceScheduleLifecycleScheduleRecord> {
  return scheduleClient.action(`/${scheduleId}`, 'PATCH', { isPaused }, 'schedule')
}

export function deactivateAllowanceScheduleLifecycleScheduleClient(
  scheduleId: string,
): Promise<void> {
  return scheduleClient.remove(scheduleId)
}
