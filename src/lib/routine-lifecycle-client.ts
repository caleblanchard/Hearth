import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  RoutineLifecycleCompletion,
  RoutineLifecycleRecord,
  RoutineLifecycleSaveInput,
} from '@/types/routine-lifecycle'

const routineClient = createLifecycleClient<RoutineLifecycleRecord>({
  basePath: '/api/routines',
  itemKey: 'routine',
  listKey: 'routines',
})

export function fetchRoutineLifecycleRoutinesClient(): Promise<RoutineLifecycleRecord[]> {
  return routineClient.list()
}

export function saveRoutineLifecycleRoutineClient(
  input: RoutineLifecycleSaveInput,
  routineId?: string,
): Promise<RoutineLifecycleRecord> {
  return routineId ? routineClient.update(routineId, input) : routineClient.create(input)
}

export function deleteRoutineLifecycleRoutineClient(routineId: string): Promise<void> {
  return routineClient.remove(routineId)
}

export function completeRoutineLifecycleRoutineClient(
  routineId: string,
): Promise<{ success: true; message: string; completion: RoutineLifecycleCompletion }> {
  return routineClient.action<{
    success: true
    message: string
    completion: RoutineLifecycleCompletion
  }>(`/${routineId}/complete`, 'POST')
}
