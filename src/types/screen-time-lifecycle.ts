import type { Database } from '@/lib/database.types'

export type ScreenTimeLifecyclePeriod =
  Database['public']['Enums']['screen_time_period']
export type ScreenTimeLifecycleGraceRepaymentMode =
  Database['public']['Enums']['grace_repayment_mode']

export interface ScreenTimeLifecycleMemberSummary {
  id: string
  name: string
}

export interface ScreenTimeLifecycleTypeRecord {
  id: string
  familyId: string
  name: string
  description: string | null
  isActive: boolean
  isArchived: boolean
  createdAt: string | null
  updatedAt: string | null
  _count?: {
    allowances?: number
    transactions?: number
  }
}

export interface ScreenTimeLifecycleAllowanceRecord {
  id: string
  memberId: string
  screenTimeTypeId: string
  allowanceMinutes: number
  period: ScreenTimeLifecyclePeriod
  rolloverEnabled: boolean
  rolloverCapMinutes: number | null
  createdAt: string | null
  updatedAt: string | null
  member?: ScreenTimeLifecycleMemberSummary
  screenTimeType?: ScreenTimeLifecycleTypeRecord | Pick<ScreenTimeLifecycleTypeRecord, 'id' | 'name'>
}

export interface ScreenTimeLifecycleAllowanceWithRemainingRecord
  extends ScreenTimeLifecycleAllowanceRecord {
  remaining: {
    remainingMinutes: number
    usedMinutes: number
    allowanceMinutes: number
    rolloverMinutes: number
    periodStart: string
    periodEnd: string
  }
}

export interface ScreenTimeLifecycleAllowanceListQuery {
  memberId?: string | null
  screenTimeTypeId?: string | null
}

export interface ScreenTimeLifecycleAllowanceListResult {
  allowances: ScreenTimeLifecycleAllowanceRecord[]
}

export interface ScreenTimeLifecycleMemberAllowanceResult {
  member: ScreenTimeLifecycleMemberSummary
  allowances: ScreenTimeLifecycleAllowanceWithRemainingRecord[]
}

export interface CreateScreenTimeLifecycleTypeInput {
  name?: string | null
  description?: string | null
}

export interface UpdateScreenTimeLifecycleTypeInput {
  name?: string | null
  description?: string | null
  isActive?: boolean
  isArchived?: boolean
}

export interface SaveScreenTimeLifecycleAllowanceInput {
  memberId?: string | null
  screenTimeTypeId?: string | null
  allowanceMinutes?: number
  period?: ScreenTimeLifecyclePeriod | string | null
  rolloverEnabled?: boolean
  rolloverCapMinutes?: number | null
}

export interface AdjustScreenTimeLifecycleBalanceInput {
  memberId?: string | null
  screenTimeTypeId?: string | null
  amountMinutes?: number
  reason?: string | null
}

export interface ScreenTimeLifecycleAdjustmentResult {
  allowanceId: string
  memberId: string
  screenTimeTypeId: string
  amountMinutes: number
  previousBalance: number
  currentBalance: number
  transactionId: string
}

export interface ScreenTimeLifecycleGraceSettings {
  id: string
  memberId: string
  gracePeriodMinutes: number
  maxGracePerDay: number
  maxGracePerWeek: number
  graceRepaymentMode: ScreenTimeLifecycleGraceRepaymentMode
  lowBalanceWarningMinutes: number
  requiresApproval: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface UpdateScreenTimeLifecycleGraceSettingsInput {
  memberId?: string | null
  gracePeriodMinutes?: number
  maxGracePerDay?: number
  maxGracePerWeek?: number
  graceRepaymentMode?: ScreenTimeLifecycleGraceRepaymentMode
  lowBalanceWarningMinutes?: number
  requiresApproval?: boolean
}

export interface ScreenTimeLifecycleGraceStatus {
  canRequestGrace: boolean
  currentBalance: number
  borrowedMinutes: number
  lowBalanceWarning: boolean
  remainingDailyRequests: number
  remainingWeeklyRequests: number
  nextResetTime: string
  settings: Pick<
    ScreenTimeLifecycleGraceSettings,
    | 'gracePeriodMinutes'
    | 'maxGracePerDay'
    | 'maxGracePerWeek'
    | 'requiresApproval'
  >
}

export interface ScreenTimeLifecycleGraceLog {
  id: string
  memberId: string
  minutesGranted: number
  reason: string | null
  approvedById: string | null
  repaymentStatus: Database['public']['Enums']['repayment_status']
  requestedAt: string
  relatedTransactionId: string | null
  repaidAt: string | null
}

export interface RequestScreenTimeLifecycleGraceInput {
  reason?: string | null
  allowanceId?: string | null
  minutes?: number | null
}

export interface ScreenTimeLifecycleGraceRequestResult {
  pendingApproval: boolean
  newBalance: number
  graceLog: ScreenTimeLifecycleGraceLog
}
