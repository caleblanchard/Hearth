export interface RoutineLifecycleStepRecord {
  id: string
  name: string
  icon?: string | null
  estimatedMinutes?: number | null
  sortOrder: number
}

export interface RoutineLifecycleRecord {
  id: string
  name: string
  type: string
  assignedTo: string | null
  isWeekday: boolean
  isWeekend: boolean
  steps: RoutineLifecycleStepRecord[]
  completedToday?: boolean
  completedAt?: string | null
}

