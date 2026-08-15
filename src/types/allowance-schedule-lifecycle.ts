import type { Frequency } from '@/lib/enums'

export interface AllowanceScheduleLifecycleMemberSummary {
  id: string
  name: string
  email: string | null
}

export interface AllowanceScheduleLifecycleScheduleRecord {
  id: string
  memberId: string
  amount: number
  frequency: Frequency
  dayOfWeek: number | null
  dayOfMonth: number | null
  isActive: boolean
  isPaused: boolean
  startDate: string
  endDate: string | null
  lastProcessedAt: string | null
  member: AllowanceScheduleLifecycleMemberSummary
}

export interface AllowanceScheduleLifecycleListResult {
  schedules: AllowanceScheduleLifecycleScheduleRecord[]
}

export interface CreateAllowanceScheduleLifecycleInput {
  memberId: string
  amount: number
  frequency: Frequency
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  startDate?: string | null
  endDate?: string | null
}

export interface UpdateAllowanceScheduleLifecycleInput {
  amount?: number
  frequency?: Frequency
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  startDate?: string | null
  endDate?: string | null
}
