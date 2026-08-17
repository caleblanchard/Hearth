import { createClient } from '@/lib/supabase/server'
import {
  LifecycleError,
  LifecycleViewerContext,
  readBoolean,
  readNullableNumber,
  readNullableString,
  readString,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { sanitizeString } from '@/lib/input-sanitization'
import type { Database } from '@/lib/database.types'
import type {
  SaveScreenTimeLifecycleAllowanceInput,
  ScreenTimeLifecycleAllowanceRecord,
  ScreenTimeLifecycleGraceLog,
  ScreenTimeLifecycleGraceSettings,
  ScreenTimeLifecycleMemberSummary,
  ScreenTimeLifecyclePeriod,
  ScreenTimeLifecycleTypeRecord,
} from '@/types/screen-time-lifecycle'

export type ScreenTimeTypeRow = Database['public']['Tables']['screen_time_types']['Row']
export type ScreenTimeTypeInsert = Database['public']['Tables']['screen_time_types']['Insert']
export type ScreenTimeTypeUpdate = Database['public']['Tables']['screen_time_types']['Update']
export type ScreenTimeAllowanceRow = Database['public']['Tables']['screen_time_allowances']['Row']
export type ScreenTimeAllowanceInsert =
  Database['public']['Tables']['screen_time_allowances']['Insert']
export type ScreenTimeBalanceRow = Database['public']['Tables']['screen_time_balances']['Row']
export type ScreenTimeBalanceInsert =
  Database['public']['Tables']['screen_time_balances']['Insert']
export type ScreenTimeGraceSettingsRow =
  Database['public']['Tables']['screen_time_grace_settings']['Row']
export type ScreenTimeGraceSettingsInsert =
  Database['public']['Tables']['screen_time_grace_settings']['Insert']
export type ScreenTimeGraceSettingsUpdate =
  Database['public']['Tables']['screen_time_grace_settings']['Update']
export type ScreenTimeTransactionInsert =
  Database['public']['Tables']['screen_time_transactions']['Insert']
export type GracePeriodLogRow = Database['public']['Tables']['grace_period_logs']['Row']
export type GracePeriodLogInsert = Database['public']['Tables']['grace_period_logs']['Insert']
export type GracePeriodLogUpdate = Database['public']['Tables']['grace_period_logs']['Update']
export type AuditAction = Database['public']['Enums']['audit_action']
export type AuditResult = Database['public']['Enums']['audit_result']
export type RepaymentStatus = Database['public']['Enums']['repayment_status']

export type MemberRow = {
  id: string
  family_id: string
  name: string
}

export type TypeRowLike = ScreenTimeTypeRow &
  Record<string, unknown> & {
    _count?: {
      allowances?: number | null
      transactions?: number | null
    }
  }

export type AllowanceRowLike = ScreenTimeAllowanceRow &
  Record<string, unknown> & {
    member?: {
      id: string
      name: string
    } | null
    screenTimeType?: Record<string, unknown> | null
    screen_time_type?: Record<string, unknown> | null
  }

export type GraceLogRowLike = GracePeriodLogRow &
  Record<string, unknown> & {
    member?: {
      id: string
      family_id: string
      name: string
    } | null
  }

export function normalizeMemberSummary(row: MemberRow): ScreenTimeLifecycleMemberSummary {
  return {
    id: row.id,
    name: row.name,
  }
}

export function normalizeScreenTimeType(row: TypeRowLike): ScreenTimeLifecycleTypeRecord {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    isArchived: row.is_archived,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    _count: row._count
      ? {
          allowances: readNullableNumber(row._count.allowances) ?? undefined,
          transactions: readNullableNumber(row._count.transactions) ?? undefined,
        }
      : undefined,
  }
}

export function normalizeAllowance(row: AllowanceRowLike): ScreenTimeLifecycleAllowanceRecord {
  const screenTimeTypeSource =
    (row.screenTimeType as Record<string, unknown> | null) ??
    (row.screen_time_type as Record<string, unknown> | null) ??
    null

  return {
    id: row.id,
    memberId: row.member_id,
    screenTimeTypeId: row.screen_time_type_id,
    allowanceMinutes: row.allowance_minutes,
    period: row.period,
    rolloverEnabled: row.rollover_enabled,
    rolloverCapMinutes: row.rollover_cap_minutes,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    member: row.member
      ? {
          id: row.member.id,
          name: row.member.name,
        }
      : undefined,
    screenTimeType: screenTimeTypeSource
      ? {
          id: readString(screenTimeTypeSource.id),
          name: readString(screenTimeTypeSource.name),
          description: readNullableString(screenTimeTypeSource.description),
          isActive: readBoolean(screenTimeTypeSource.is_active ?? screenTimeTypeSource.isActive, true),
          isArchived: readBoolean(
            screenTimeTypeSource.is_archived ?? screenTimeTypeSource.isArchived,
            false
          ),
          familyId: readString(
            screenTimeTypeSource.family_id ?? screenTimeTypeSource.familyId
          ),
          createdAt: readNullableString(
            screenTimeTypeSource.created_at ?? screenTimeTypeSource.createdAt
          ),
          updatedAt: readNullableString(
            screenTimeTypeSource.updated_at ?? screenTimeTypeSource.updatedAt
          ),
        }
      : undefined,
  }
}

export function normalizeGraceSettings(
  settings: ScreenTimeGraceSettingsRow
): ScreenTimeLifecycleGraceSettings {
  return {
    id: settings.id,
    memberId: settings.member_id,
    gracePeriodMinutes: settings.grace_period_minutes,
    maxGracePerDay: settings.max_grace_per_day,
    maxGracePerWeek: settings.max_grace_per_week,
    graceRepaymentMode: settings.grace_repayment_mode,
    lowBalanceWarningMinutes: settings.low_balance_warning_minutes,
    requiresApproval: settings.requires_approval,
    createdAt: settings.created_at ?? null,
    updatedAt: settings.updated_at ?? null,
  }
}

export function normalizeGraceLog(row: GraceLogRowLike): ScreenTimeLifecycleGraceLog {
  return {
    id: row.id,
    memberId: row.member_id,
    minutesGranted: row.minutes_granted,
    reason: row.reason,
    approvedById: row.approved_by_id,
    repaymentStatus: row.repayment_status,
    requestedAt: row.requested_at,
    relatedTransactionId: row.related_transaction_id,
    repaidAt: row.repaid_at,
  }
}

export function normalizeTypeName(name: string | null | undefined) {
  const value = sanitizeString(name ?? '')
  if (!value) {
    throw new LifecycleError(400, 'Name is required')
  }

  return value
}

export function ensureValidPeriod(
  period: SaveScreenTimeLifecycleAllowanceInput['period']
): ScreenTimeLifecyclePeriod {
  if (period === 'DAILY' || period === 'WEEKLY') {
    return period
  }

  throw new LifecycleError(400, 'Invalid period - must be DAILY or WEEKLY')
}

export function ensureNonNegativeNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new LifecycleError(400, message)
  }

  return value
}

export function buildNextResetTime() {
  const nextReset = new Date()
  nextReset.setHours(24, 0, 0, 0)
  return nextReset.toISOString()
}

export async function loadOwnedMember(
  memberId: string,
  familyId: string
): Promise<MemberRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('family_members')
    .select('id, family_id, name')
    .eq('id', memberId)
    .single()

  if (error || !data) {
    throw new LifecycleError(404, 'Member not found')
  }

  if (data.family_id !== familyId) {
    throw new LifecycleError(404, 'Member not found')
  }

  return data as MemberRow
}

export async function loadOwnedType(
  typeId: string,
  familyId: string,
  archivedMessage = 'Screen time type not found or is archived'
): Promise<ScreenTimeTypeRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_types')
    .select('*')
    .eq('id', typeId)
    .single()

  if (error || !data) {
    throw new LifecycleError(404, 'Screen time type not found')
  }

  if (data.family_id !== familyId) {
    throw new LifecycleError(404, 'Screen time type not found')
  }

  if (data.is_archived) {
    throw new LifecycleError(400, archivedMessage)
  }

  return data as ScreenTimeTypeRow
}

export async function ensureBalanceRow(memberId: string): Promise<ScreenTimeBalanceRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_balances')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    return data as ScreenTimeBalanceRow
  }

  const insertPayload: ScreenTimeBalanceInsert = {
    member_id: memberId,
    current_balance_minutes: 0,
    week_start_date: new Date().toISOString().slice(0, 10),
  }

  const inserted = await supabase
    .from('screen_time_balances')
    .insert(insertPayload)
    .select()
    .single()

  if (inserted.error || !inserted.data) {
    throw inserted.error ?? new Error('Failed to create balance')
  }

  return inserted.data as ScreenTimeBalanceRow
}

export async function requireViewerAccessToMember(
  requestedMemberId: string | undefined | null
): Promise<{ context: LifecycleViewerContext; targetMemberId: string }> {
  const context = await requireViewerContext()
  const targetMemberId = sanitizeString(requestedMemberId ?? '') || context.memberId

  if (targetMemberId === context.memberId) {
    return { context, targetMemberId }
  }

  await requireParentContext('Cannot view other members status')
  await loadOwnedMember(targetMemberId, context.familyId)
  return { context, targetMemberId }
}
