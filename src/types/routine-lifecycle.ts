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

export interface RoutineLifecycleStepInput {
  name: string
  icon?: string | null
  estimatedMinutes?: number | null
}

export interface RoutineLifecycleSaveInput {
  name: string
  type: string
  assignedTo: string | null
  isWeekday: boolean
  isWeekend: boolean
  steps: RoutineLifecycleStepInput[]
}

export interface RoutineLifecycleCompletion {
  id: string
  routine_id: string
  member_id: string
  completed_at: string
  date: string
}

