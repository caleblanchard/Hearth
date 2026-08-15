import { apiRequest } from '@/lib/api-client'

export async function fetchRoutineLifecycleRoutinesClient() {
  const data = await apiRequest<{ routines: any[] }>('/api/routines')
  return data.routines
}

export async function saveRoutineLifecycleRoutineClient(
  input: Record<string, unknown>,
  routineId?: string
) {
  const data = await apiRequest<{ routine: any }>(
    routineId ? `/api/routines/${routineId}` : '/api/routines',
    {
      method: routineId ? 'PATCH' : 'POST',
      body: JSON.stringify(input),
    }
  )
  return data.routine
}

export async function deleteRoutineLifecycleRoutineClient(routineId: string) {
  await apiRequest<{ success: true }>(`/api/routines/${routineId}`, { method: 'DELETE' })
}

export async function completeRoutineLifecycleRoutineClient(routineId: string) {
  return apiRequest<{ success: true; message: string; completion: any }>(
    `/api/routines/${routineId}/complete`,
    { method: 'POST' }
  )
}
