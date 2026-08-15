import type {
  AllowanceScheduleLifecycleListResult,
  AllowanceScheduleLifecycleScheduleRecord,
  CreateAllowanceScheduleLifecycleInput,
  UpdateAllowanceScheduleLifecycleInput,
} from '@/types/allowance-schedule-lifecycle'
import { apiRequest } from '@/lib/api-client'

export async function fetchAllowanceScheduleLifecycleSchedulesClient() {
  const data = await apiRequest<AllowanceScheduleLifecycleListResult>('/api/allowance')
  return data.schedules
}

export async function createAllowanceScheduleLifecycleScheduleClient(
  input: CreateAllowanceScheduleLifecycleInput
) {
  const data = await apiRequest<{
    success: true
    schedule: AllowanceScheduleLifecycleScheduleRecord
  }>('/api/allowance', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.schedule
}

export async function updateAllowanceScheduleLifecycleScheduleClient(
  scheduleId: string,
  input: UpdateAllowanceScheduleLifecycleInput
) {
  const data = await apiRequest<{
    success: true
    schedule: AllowanceScheduleLifecycleScheduleRecord
  }>(`/api/allowance/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return data.schedule
}

export async function setAllowanceScheduleLifecyclePausedClient(
  scheduleId: string,
  isPaused: boolean
) {
  const data = await apiRequest<{
    success: true
    schedule: AllowanceScheduleLifecycleScheduleRecord
  }>(`/api/allowance/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isPaused }),
  })
  return data.schedule
}

export async function deactivateAllowanceScheduleLifecycleScheduleClient(
  scheduleId: string
) {
  await apiRequest<{ success: true }>(`/api/allowance/${scheduleId}`, {
    method: 'DELETE',
  })
}
