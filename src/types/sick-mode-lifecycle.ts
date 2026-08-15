import type { Database } from '@/lib/database.types'

type SickModeTrigger = Database['public']['Enums']['sick_mode_trigger']

export interface SickModeLifecycleMemberSummary {
  id: string
  name: string
}

export interface SickModeLifecycleInstanceRecord {
  id: string
  familyId: string
  memberId: string
  isActive: boolean
  startedAt: string
  endedAt: string | null
  endedById: string | null
  triggeredBy: SickModeTrigger
  healthEventId: string | null
  notes: string | null
  member: SickModeLifecycleMemberSummary | null
}

export interface SickModeLifecycleSettingsRecord {
  id: string
  familyId: string
  autoEnableOnTemperature: boolean
  temperatureThreshold: number
  autoDisableAfter24Hours: boolean
  pauseChores: boolean
  pauseScreenTimeTracking: boolean
  screenTimeBonus: number
  skipMorningRoutine: boolean
  skipBedtimeRoutine: boolean
  muteNonEssentialNotifs: boolean
}

export interface ListSickModeLifecycleInstancesQuery {
  memberId?: string | null
  includeEnded?: boolean
}

export interface ListSickModeLifecycleInstancesResult {
  instances: SickModeLifecycleInstanceRecord[]
}

export interface StartSickModeLifecycleInput {
  memberId: string
  notes?: string | null
  healthEventId?: string | null
}

export interface StartSickModeLifecycleResult {
  instance: SickModeLifecycleInstanceRecord
  settings: SickModeLifecycleSettingsRecord
}

export interface EndSickModeLifecycleResult {
  instance: SickModeLifecycleInstanceRecord
}
