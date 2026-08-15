import { createClient } from '@/lib/supabase/server'
import {
  insertAuditLog,
  LifecycleError,
  LifecycleViewerContext,
  readBoolean,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { checkGraceEligibility, getOrCreateGraceSettings } from '@/lib/screentime-grace'
import { calculateRemainingTime } from '@/lib/screentime-utils'
import { sanitizeInteger, sanitizeString } from '@/lib/input-sanitization'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import type {
  AdjustScreenTimeLifecycleBalanceInput,
  CreateScreenTimeLifecycleTypeInput,
  RequestScreenTimeLifecycleGraceInput,
  SaveScreenTimeLifecycleAllowanceInput,
  ScreenTimeLifecycleAllowanceListQuery,
  ScreenTimeLifecycleAllowanceListResult,
  ScreenTimeLifecycleAllowanceRecord,
  ScreenTimeLifecycleAllowanceWithRemainingRecord,
  ScreenTimeLifecycleAdjustmentResult,
  ScreenTimeLifecycleGraceLog,
  ScreenTimeLifecycleGraceRequestResult,
  ScreenTimeLifecycleGraceSettings,
  ScreenTimeLifecycleGraceStatus,
  ScreenTimeLifecycleMemberAllowanceResult,
  ScreenTimeLifecycleMemberSummary,
  ScreenTimeLifecyclePeriod,
  ScreenTimeLifecycleTypeRecord,
  UpdateScreenTimeLifecycleGraceSettingsInput,
  UpdateScreenTimeLifecycleTypeInput,
} from '@/types/screen-time-lifecycle'

type ScreenTimeTypeRow = Database['public']['Tables']['screen_time_types']['Row']
type ScreenTimeTypeInsert = Database['public']['Tables']['screen_time_types']['Insert']
type ScreenTimeTypeUpdate = Database['public']['Tables']['screen_time_types']['Update']
type ScreenTimeAllowanceRow = Database['public']['Tables']['screen_time_allowances']['Row']
type ScreenTimeAllowanceInsert =
  Database['public']['Tables']['screen_time_allowances']['Insert']
type ScreenTimeBalanceRow = Database['public']['Tables']['screen_time_balances']['Row']
type ScreenTimeBalanceInsert =
  Database['public']['Tables']['screen_time_balances']['Insert']
type ScreenTimeGraceSettingsRow =
  Database['public']['Tables']['screen_time_grace_settings']['Row']
type ScreenTimeGraceSettingsInsert =
  Database['public']['Tables']['screen_time_grace_settings']['Insert']
type ScreenTimeGraceSettingsUpdate =
  Database['public']['Tables']['screen_time_grace_settings']['Update']
type ScreenTimeTransactionInsert =
  Database['public']['Tables']['screen_time_transactions']['Insert']
type GracePeriodLogRow = Database['public']['Tables']['grace_period_logs']['Row']
type GracePeriodLogInsert = Database['public']['Tables']['grace_period_logs']['Insert']
type GracePeriodLogUpdate = Database['public']['Tables']['grace_period_logs']['Update']
type AuditAction = Database['public']['Enums']['audit_action']
type AuditResult = Database['public']['Enums']['audit_result']
type RepaymentStatus = Database['public']['Enums']['repayment_status']

type MemberRow = {
  id: string
  family_id: string
  name: string
}

type TypeRowLike = ScreenTimeTypeRow &
  Record<string, unknown> & {
    _count?: {
      allowances?: number | null
      transactions?: number | null
    }
  }

type AllowanceRowLike = ScreenTimeAllowanceRow &
  Record<string, unknown> & {
    member?: {
      id: string
      name: string
    } | null
    screenTimeType?: Record<string, unknown> | null
    screen_time_type?: Record<string, unknown> | null
  }

type GraceLogRowLike = GracePeriodLogRow &
  Record<string, unknown> & {
    member?: {
      id: string
      family_id: string
      name: string
    } | null
  }

function normalizeMemberSummary(row: MemberRow): ScreenTimeLifecycleMemberSummary {
  return {
    id: row.id,
    name: row.name,
  }
}

function normalizeScreenTimeType(row: TypeRowLike): ScreenTimeLifecycleTypeRecord {
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

function normalizeAllowance(row: AllowanceRowLike): ScreenTimeLifecycleAllowanceRecord {
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

function normalizeGraceSettings(
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

function normalizeGraceLog(row: GraceLogRowLike): ScreenTimeLifecycleGraceLog {
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

function normalizeTypeName(name: string | null | undefined) {
  const value = sanitizeString(name ?? '')
  if (!value) {
    throw new LifecycleError(400, 'Name is required')
  }

  return value
}

function ensureValidPeriod(
  period: SaveScreenTimeLifecycleAllowanceInput['period']
): ScreenTimeLifecyclePeriod {
  if (period === 'DAILY' || period === 'WEEKLY') {
    return period
  }

  throw new LifecycleError(400, 'Invalid period - must be DAILY or WEEKLY')
}

function ensureNonNegativeNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new LifecycleError(400, message)
  }

  return value
}

function buildNextResetTime() {
  const nextReset = new Date()
  nextReset.setHours(24, 0, 0, 0)
  return nextReset.toISOString()
}

async function loadOwnedMember(
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

async function loadOwnedType(
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

async function ensureBalanceRow(memberId: string): Promise<ScreenTimeBalanceRow> {
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

async function writeAuditLog(
  familyId: string,
  memberId: string,
  payload: {
    action: AuditAction
    entityId: string
    metadata?: Record<string, unknown>
  }
) {
  try {
    await insertAuditLog({
      familyId,
      memberId,
      action: payload.action,
      entityType: 'SCREENTIME_ALLOWANCE',
      entityId: payload.entityId,
      metadata: payload.metadata ?? {},
    })
  } catch (error) {
    logger.warn('Failed to write screen time lifecycle audit log')
  }
}

async function requireViewerAccessToMember(
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

export async function listScreenTimeLifecycleTypes(): Promise<{
  types: ScreenTimeLifecycleTypeRecord[]
}> {
  const context = await requireViewerContext()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_types')
    .select('*')
    .eq('family_id', context.familyId)
    .order('name')

  if (error) {
    throw error
  }

  return {
    types: ((data ?? []) as TypeRowLike[]).map(normalizeScreenTimeType),
  }
}

export async function getScreenTimeLifecycleType(
  typeId: string
): Promise<ScreenTimeLifecycleTypeRecord> {
  const context = await requireViewerContext()
  const row = await loadOwnedType(typeId, context.familyId, 'Screen time type not found')
  return normalizeScreenTimeType(row as TypeRowLike)
}

export async function createScreenTimeLifecycleType(
  input: CreateScreenTimeLifecycleTypeInput
): Promise<ScreenTimeLifecycleTypeRecord> {
  const context = await requireParentContext('Parent access required')
  const supabase = await createClient()
  const payload: ScreenTimeTypeInsert = {
    family_id: context.familyId,
    name: normalizeTypeName(input.name),
    description: sanitizeString(input.description ?? '') || null,
    is_active: true,
    is_archived: false,
  }

  const { data, error } = await supabase
    .from('screen_time_types')
    .insert(payload)
    .select()
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to create screen time type')
  }

  return normalizeScreenTimeType(data as TypeRowLike)
}

export async function updateScreenTimeLifecycleType(
  typeId: string,
  input: UpdateScreenTimeLifecycleTypeInput
): Promise<ScreenTimeLifecycleTypeRecord> {
  const context = await requireParentContext('Parent access required')
  await loadOwnedType(typeId, context.familyId, 'Screen time type not found')

  const updates: ScreenTimeTypeUpdate = {}

  if (typeof input.name !== 'undefined') {
    updates.name = normalizeTypeName(input.name)
  }

  if (typeof input.description !== 'undefined') {
    updates.description = sanitizeString(input.description ?? '') || null
  }

  if (typeof input.isActive === 'boolean') {
    updates.is_active = input.isActive
  }

  if (typeof input.isArchived === 'boolean') {
    updates.is_archived = input.isArchived
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_types')
    .update(updates)
    .eq('id', typeId)
    .select()
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to update screen time type')
  }

  return normalizeScreenTimeType(data as TypeRowLike)
}

export async function archiveScreenTimeLifecycleType(typeId: string): Promise<void> {
  const context = await requireParentContext('Parent access required')
  await loadOwnedType(typeId, context.familyId, 'Screen time type not found')

  const supabase = await createClient()
  const { error } = await supabase
    .from('screen_time_types')
    .update({
      is_archived: true,
      is_active: false,
    })
    .eq('id', typeId)

  if (error) {
    throw error
  }
}

export async function listScreenTimeLifecycleAllowances(
  query: ScreenTimeLifecycleAllowanceListQuery = {}
): Promise<ScreenTimeLifecycleAllowanceListResult> {
  const memberId = sanitizeString(query.memberId ?? '')
  if (memberId) {
    const result = await getScreenTimeLifecycleAllowancesForMember(memberId)
    const filtered = query.screenTimeTypeId
      ? result.allowances.filter(
          (allowance) => allowance.screenTimeTypeId === query.screenTimeTypeId
        )
      : result.allowances

    return { allowances: filtered }
  }

  const context = await requireParentContext('Parent access required')
  const supabase = await createClient()
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', context.familyId)
    .eq('is_active', true)

  if (membersError) {
    throw membersError
  }

  const memberIds = (members ?? []).map((member) => member.id)
  if (memberIds.length === 0) {
    return { allowances: [] }
  }

  const { data, error } = await supabase
    .from('screen_time_allowances')
    .select(`
      *,
      member:family_members!screen_time_allowances_member_id_fkey(id, name),
      screenTimeType:screen_time_types!screen_time_allowances_screen_time_type_id_fkey(*)
    `)
    .in('member_id', memberIds)
    .order('member_id')

  if (error) {
    throw error
  }

  const allowances = ((data ?? []) as AllowanceRowLike[])
    .map(normalizeAllowance)
    .filter(
      (allowance) =>
        !allowance.screenTimeType ||
        !('isArchived' in allowance.screenTimeType) ||
        !allowance.screenTimeType.isArchived
    )

  return {
    allowances: query.screenTimeTypeId
      ? allowances.filter(
          (allowance) => allowance.screenTimeTypeId === query.screenTimeTypeId
        )
      : allowances,
  }
}

export async function getScreenTimeLifecycleAllowancesForMember(
  memberId: string
): Promise<ScreenTimeLifecycleMemberAllowanceResult> {
  const { context, targetMemberId } = await requireViewerAccessToMember(memberId)
  const member = await loadOwnedMember(targetMemberId, context.familyId)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_allowances')
    .select(`
      *,
      screen_time_type:screen_time_types(id, name, description, is_active, is_archived, family_id, created_at, updated_at)
    `)
    .eq('member_id', targetMemberId)
    .eq('screen_time_type.is_active', true)
    .eq('screen_time_type.is_archived', false)
    .order('screen_time_type_id')

  if (error) {
    throw error
  }

  const allowances = await Promise.all(
    ((data ?? []) as AllowanceRowLike[]).map(async (row) => {
      const allowance = normalizeAllowance(row)
      const remaining = await calculateRemainingTime(
        targetMemberId,
        allowance.screenTimeTypeId
      )

      return {
        ...allowance,
        remaining: {
          remainingMinutes: remaining.remainingMinutes,
          usedMinutes: remaining.usedMinutes,
          allowanceMinutes: remaining.allowanceMinutes,
          rolloverMinutes: remaining.rolloverMinutes,
          periodStart: remaining.periodStart.toISOString(),
          periodEnd: remaining.periodEnd.toISOString(),
        },
      } satisfies ScreenTimeLifecycleAllowanceWithRemainingRecord
    })
  )

  return {
    member: normalizeMemberSummary(member),
    allowances,
  }
}

export async function saveScreenTimeLifecycleAllowance(
  input: SaveScreenTimeLifecycleAllowanceInput
): Promise<ScreenTimeLifecycleAllowanceRecord> {
  const context = await requireParentContext('Only parents can manage screen time allowances')
  const memberId = sanitizeString(input.memberId ?? '')
  const screenTimeTypeId = sanitizeString(input.screenTimeTypeId ?? '')

  if (!memberId || !screenTimeTypeId || typeof input.allowanceMinutes !== 'number') {
    throw new LifecycleError(
      400,
      'Member ID, screen time type ID, allowance minutes, and period are required'
    )
  }

  const allowanceMinutes = ensureNonNegativeNumber(
    input.allowanceMinutes,
    'Allowance minutes must be non-negative'
  )
  const period = ensureValidPeriod(input.period)
  const rolloverEnabled = Boolean(input.rolloverEnabled)
  const rolloverCapMinutes =
    input.rolloverCapMinutes === undefined || input.rolloverCapMinutes === null
      ? null
      : ensureNonNegativeNumber(
          input.rolloverCapMinutes,
          'Rollover cap must be non-negative'
        )

  await loadOwnedMember(memberId, context.familyId)
  await loadOwnedType(
    screenTimeTypeId,
    context.familyId,
    'Screen time type not found or is archived'
  )

  const supabase = await createClient()
  const payload: ScreenTimeAllowanceInsert = {
    member_id: memberId,
    screen_time_type_id: screenTimeTypeId,
    allowance_minutes: allowanceMinutes,
    period,
    rollover_enabled: rolloverEnabled,
    rollover_cap_minutes: rolloverEnabled ? rolloverCapMinutes : null,
  }

  const { data, error } = await supabase
    .from('screen_time_allowances')
    .upsert(payload, {
      onConflict: 'member_id,screen_time_type_id',
    })
    .select(`
      *,
      member:family_members!screen_time_allowances_member_id_fkey(id, name),
      screenTimeType:screen_time_types!screen_time_allowances_screen_time_type_id_fkey(*)
    `)
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to save allowance')
  }

  return normalizeAllowance(data as AllowanceRowLike)
}

export async function adjustScreenTimeLifecycleBalance(
  input: AdjustScreenTimeLifecycleBalanceInput
): Promise<ScreenTimeLifecycleAdjustmentResult> {
  const context = await requireParentContext('Unauthorized - Parent access required')
  const memberId = sanitizeString(input.memberId ?? '')
  const screenTimeTypeId = sanitizeString(input.screenTimeTypeId ?? '')

  if (!memberId || !screenTimeTypeId || typeof input.amountMinutes !== 'number' || input.amountMinutes === 0) {
    throw new LifecycleError(
      400,
      'Member ID, screen time type ID, and non-zero amount required'
    )
  }

  const member = await loadOwnedMember(memberId, context.familyId)
  await loadOwnedType(screenTimeTypeId, context.familyId, 'Screen time type not found')

  const supabase = await createClient()
  const allowanceResult = await supabase
    .from('screen_time_allowances')
    .select('id')
    .eq('member_id', memberId)
    .eq('screen_time_type_id', screenTimeTypeId)
    .maybeSingle()

  if (allowanceResult.error) {
    throw allowanceResult.error
  }

  if (!allowanceResult.data) {
    throw new LifecycleError(404, 'Allowance not found')
  }

  const balance = await ensureBalanceRow(memberId)
  const previousBalance = balance.current_balance_minutes
  const currentBalance = Math.max(0, previousBalance + input.amountMinutes)

  const transactionPayload: ScreenTimeTransactionInsert = {
    member_id: memberId,
    created_by_id: context.memberId,
    screen_time_type_id: screenTimeTypeId,
    amount_minutes: input.amountMinutes,
    balance_after: currentBalance,
    type: 'ADJUSTMENT',
    reason: sanitizeString(input.reason ?? '') || null,
    was_override: false,
  }

  const transactionResult = await supabase
    .from('screen_time_transactions')
    .insert(transactionPayload)
    .select()
    .single()

  if (transactionResult.error || !transactionResult.data) {
    throw transactionResult.error ?? new Error('Failed to record adjustment')
  }

  const balanceUpdate = await supabase
    .from('screen_time_balances')
    .update({
      current_balance_minutes: currentBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', memberId)

  if (balanceUpdate.error) {
    throw balanceUpdate.error
  }

  await writeAuditLog(context.familyId, context.memberId, {
    action: 'SCREENTIME_ADJUSTED' satisfies AuditAction,
    entityId: allowanceResult.data.id,
    metadata: {
      targetMember: member.name,
      adjustment: input.amountMinutes,
      reason: sanitizeString(input.reason ?? '') || null,
      previousBalance,
      currentBalance,
    },
  })

  return {
    allowanceId: allowanceResult.data.id,
    memberId,
    screenTimeTypeId,
    amountMinutes: input.amountMinutes,
    previousBalance,
    currentBalance,
    transactionId: transactionResult.data.id,
  }
}

export async function getScreenTimeLifecycleGraceSettings(
  memberId?: string | null
): Promise<ScreenTimeLifecycleGraceSettings> {
  const { context, targetMemberId } = await requireViewerAccessToMember(memberId)
  await loadOwnedMember(targetMemberId, context.familyId)
  const settings = (await getOrCreateGraceSettings(
    targetMemberId
  )) as ScreenTimeGraceSettingsRow
  return normalizeGraceSettings(settings)
}

export async function updateScreenTimeLifecycleGraceSettings(
  input: UpdateScreenTimeLifecycleGraceSettingsInput
): Promise<ScreenTimeLifecycleGraceSettings> {
  const context = await requireParentContext('Only parents can update grace settings')
  const memberId = sanitizeString(input.memberId ?? '')

  if (!memberId) {
    throw new LifecycleError(400, 'Member ID is required')
  }

  await loadOwnedMember(memberId, context.familyId)

  const currentSettings = (await getOrCreateGraceSettings(
    memberId
  )) as ScreenTimeGraceSettingsRow
  const updates: ScreenTimeGraceSettingsUpdate = {}

  if (typeof input.gracePeriodMinutes !== 'undefined') {
    updates.grace_period_minutes = ensureNonNegativeNumber(
      input.gracePeriodMinutes,
      'Grace period minutes must be non-negative'
    )
  }

  if (typeof input.maxGracePerDay !== 'undefined') {
    updates.max_grace_per_day = ensureNonNegativeNumber(
      input.maxGracePerDay,
      'Maximum requests per day must be non-negative'
    )
  }

  if (typeof input.maxGracePerWeek !== 'undefined') {
    updates.max_grace_per_week = ensureNonNegativeNumber(
      input.maxGracePerWeek,
      'Maximum requests per week must be non-negative'
    )
  }

  if (typeof input.lowBalanceWarningMinutes !== 'undefined') {
    updates.low_balance_warning_minutes = ensureNonNegativeNumber(
      input.lowBalanceWarningMinutes,
      'Low balance warning minutes must be non-negative'
    )
  }

  if (typeof input.requiresApproval === 'boolean') {
    updates.requires_approval = input.requiresApproval
  }

  if (input.graceRepaymentMode) {
    updates.grace_repayment_mode = input.graceRepaymentMode
  }

  const payload: ScreenTimeGraceSettingsInsert = {
    member_id: memberId,
    grace_period_minutes:
      updates.grace_period_minutes ?? currentSettings.grace_period_minutes,
    max_grace_per_day: updates.max_grace_per_day ?? currentSettings.max_grace_per_day,
    max_grace_per_week:
      updates.max_grace_per_week ?? currentSettings.max_grace_per_week,
    grace_repayment_mode:
      updates.grace_repayment_mode ?? currentSettings.grace_repayment_mode,
    low_balance_warning_minutes:
      updates.low_balance_warning_minutes ??
      currentSettings.low_balance_warning_minutes,
    requires_approval:
      updates.requires_approval ?? currentSettings.requires_approval,
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_grace_settings')
    .upsert(payload)
    .select()
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to update grace settings')
  }

  return normalizeGraceSettings(data as ScreenTimeGraceSettingsRow)
}

export async function getScreenTimeLifecycleGraceStatus(
  memberId?: string | null
): Promise<ScreenTimeLifecycleGraceStatus> {
  const { context, targetMemberId } = await requireViewerAccessToMember(memberId)
  await loadOwnedMember(targetMemberId, context.familyId)
  const settingsRow = (await getOrCreateGraceSettings(
    targetMemberId
  )) as ScreenTimeGraceSettingsRow
  const settings = normalizeGraceSettings(settingsRow)
  const eligibility = await checkGraceEligibility(targetMemberId, settingsRow)
  const balance = await ensureBalanceRow(targetMemberId)

  const supabase = await createClient()
  const borrowedLogs = await supabase
    .from('grace_period_logs')
    .select('minutes_granted, approved_by_id')
    .eq('member_id', targetMemberId)
    .eq('repayment_status', 'PENDING' satisfies RepaymentStatus)

  if (borrowedLogs.error) {
    throw borrowedLogs.error
  }

  const borrowedMinutes = ((borrowedLogs.data ?? []) as Array<Record<string, unknown>>)
    .filter((log) => Boolean(log.approved_by_id))
    .reduce((sum, log) => sum + readNumber(log.minutes_granted), 0)

  return {
    canRequestGrace: Boolean(eligibility.eligible),
    currentBalance: balance.current_balance_minutes,
    borrowedMinutes,
    lowBalanceWarning:
      balance.current_balance_minutes < settings.lowBalanceWarningMinutes,
    remainingDailyRequests: readNumber(
      (eligibility as Record<string, unknown>).remainingDaily
    ),
    remainingWeeklyRequests: readNumber(
      (eligibility as Record<string, unknown>).remainingWeekly
    ),
    nextResetTime: buildNextResetTime(),
    settings: {
      gracePeriodMinutes: settings.gracePeriodMinutes,
      maxGracePerDay: settings.maxGracePerDay,
      maxGracePerWeek: settings.maxGracePerWeek,
      requiresApproval: settings.requiresApproval,
    },
  }
}

export async function requestScreenTimeLifecycleGrace(
  input: RequestScreenTimeLifecycleGraceInput = {}
): Promise<ScreenTimeLifecycleGraceRequestResult> {
  const context = await requireViewerContext()
  const settingsRow = (await getOrCreateGraceSettings(
    context.memberId
  )) as ScreenTimeGraceSettingsRow
  const settings = normalizeGraceSettings(settingsRow)
  const eligibility = await checkGraceEligibility(context.memberId, settingsRow)

  if (!eligibility.eligible) {
    throw new LifecycleError(
      400,
      readString((eligibility as Record<string, unknown>).reason, 'Grace period unavailable')
    )
  }

  const balance = await ensureBalanceRow(context.memberId)
  const requestedMinutes =
    typeof input.minutes === 'number' && Number.isFinite(input.minutes) && input.minutes > 0
      ? input.minutes
      : settings.gracePeriodMinutes
  const reason = sanitizeString(input.reason ?? '') || null
  const supabase = await createClient()

  if (settings.requiresApproval) {
    const graceLogResult = await supabase
      .from('grace_period_logs')
      .insert({
        member_id: context.memberId,
        minutes_granted: requestedMinutes,
        reason,
        approved_by_id: null,
        repayment_status: 'PENDING',
      } satisfies GracePeriodLogInsert)
      .select()
      .single()

    if (graceLogResult.error || !graceLogResult.data) {
      throw graceLogResult.error ?? new Error('Failed to request grace period')
    }

    return {
      pendingApproval: true,
      newBalance: balance.current_balance_minutes,
      graceLog: normalizeGraceLog(graceLogResult.data as GraceLogRowLike),
    }
  }

  const newBalance = balance.current_balance_minutes + requestedMinutes
  const transactionResult = await supabase
    .from('screen_time_transactions')
    .insert({
      member_id: context.memberId,
      created_by_id: context.memberId,
      screen_time_type_id: null,
      amount_minutes: requestedMinutes,
      balance_after: newBalance,
      type: 'GRACE_BORROWED',
      reason,
      was_override: false,
    } satisfies ScreenTimeTransactionInsert)
    .select()
    .single()

  if (transactionResult.error || !transactionResult.data) {
    throw transactionResult.error ?? new Error('Failed to request grace period')
  }

  const balanceUpdate = await supabase
    .from('screen_time_balances')
    .update({
      current_balance_minutes: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', context.memberId)

  if (balanceUpdate.error) {
    throw balanceUpdate.error
  }

  const graceLogResult = await supabase
    .from('grace_period_logs')
    .insert({
      member_id: context.memberId,
      minutes_granted: requestedMinutes,
      reason,
      approved_by_id: context.memberId,
      related_transaction_id: transactionResult.data.id,
      repayment_status: 'PENDING',
    } satisfies GracePeriodLogInsert)
    .select()
    .single()

  if (graceLogResult.error || !graceLogResult.data) {
    throw graceLogResult.error ?? new Error('Failed to request grace period')
  }

  return {
    pendingApproval: false,
    newBalance,
    graceLog: normalizeGraceLog(graceLogResult.data as GraceLogRowLike),
  }
}

async function ensureGraceDecisionOwnership(
  graceLogId: string,
  approverMemberId: string
): Promise<GraceLogRowLike> {
  const supabase = await createClient()
  const graceLogResult = await (supabase as any)
    .from('grace_period_logs')
    .select(`
      *,
      member:family_members(id, family_id, name)
    `)
    .eq('id', graceLogId)
    .single()

  if (graceLogResult.error || !graceLogResult.data) {
    throw new LifecycleError(404, 'Grace request not found')
  }

  const graceLog = graceLogResult.data as GraceLogRowLike
  const member = graceLog.member

  if (!member) {
    throw new LifecycleError(404, 'Grace request not found')
  }

  const approver = await loadOwnedMember(approverMemberId, member.family_id)
  if (!approver) {
    throw new LifecycleError(403, 'Forbidden')
  }

  return graceLog
}

export async function approveScreenTimeLifecycleGrace(
  graceLogId: string,
  approvedByMemberId: string
): Promise<ScreenTimeLifecycleGraceLog> {
  const supabase = await createClient()
  const graceLog = await ensureGraceDecisionOwnership(graceLogId, approvedByMemberId)

  if (graceLog.approved_by_id) {
    return normalizeGraceLog(graceLog)
  }

  const balance = await ensureBalanceRow(graceLog.member_id)
  const newBalance = balance.current_balance_minutes + graceLog.minutes_granted
  const transactionResult = await supabase
    .from('screen_time_transactions')
    .insert({
      member_id: graceLog.member_id,
      created_by_id: approvedByMemberId,
      screen_time_type_id: null,
      amount_minutes: graceLog.minutes_granted,
      balance_after: newBalance,
      type: 'GRACE_BORROWED',
      reason: graceLog.reason,
      was_override: false,
    } satisfies ScreenTimeTransactionInsert)
    .select()
    .single()

  if (transactionResult.error || !transactionResult.data) {
    throw transactionResult.error ?? new Error('Failed to approve grace request')
  }

  const balanceUpdate = await supabase
    .from('screen_time_balances')
    .update({
      current_balance_minutes: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', graceLog.member_id)

  if (balanceUpdate.error) {
    throw balanceUpdate.error
  }

  const updateResult = await supabase
    .from('grace_period_logs')
    .update({
      approved_by_id: approvedByMemberId,
      related_transaction_id: transactionResult.data.id,
      repayment_status: 'PENDING',
    } satisfies GracePeriodLogUpdate)
    .eq('id', graceLogId)
    .select()
    .single()

  if (updateResult.error || !updateResult.data) {
    throw updateResult.error ?? new Error('Failed to approve grace request')
  }

  return normalizeGraceLog(updateResult.data as GraceLogRowLike)
}

export async function rejectScreenTimeLifecycleGrace(
  graceLogId: string,
  rejectedByMemberId: string
): Promise<ScreenTimeLifecycleGraceLog> {
  const supabase = await createClient()
  await ensureGraceDecisionOwnership(graceLogId, rejectedByMemberId)

  const updateResult = await supabase
    .from('grace_period_logs')
    .update({
      approved_by_id: rejectedByMemberId,
      repayment_status: 'FORGIVEN',
      repaid_at: new Date().toISOString(),
    } satisfies GracePeriodLogUpdate)
    .eq('id', graceLogId)
    .select()
    .single()

  if (updateResult.error || !updateResult.data) {
    throw updateResult.error ?? new Error('Failed to reject grace request')
  }

  return normalizeGraceLog(updateResult.data as GraceLogRowLike)
}

export interface LogScreenTimeLifecycleSessionInput {
  minutes?: unknown
  screenTimeTypeId?: unknown
}

export async function logScreenTimeLifecycleSession(
  body: LogScreenTimeLifecycleSessionInput
): Promise<Database['public']['Tables']['screen_time_transactions']['Row']> {
  const viewer = await requireViewerContext()

  const minutes = sanitizeInteger(body.minutes as string | number | null | undefined, 1)
  if (minutes === null) {
    throw new LifecycleError(400, 'Valid minutes value is required')
  }

  const screenTimeTypeId = sanitizeString(body.screenTimeTypeId as string | null | undefined)
  if (!screenTimeTypeId) {
    throw new LifecycleError(400, 'Screen time type ID is required')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('screen_time_transactions')
    .insert({
      member_id: viewer.memberId,
      created_by_id: viewer.memberId,
      screen_time_type_id: screenTimeTypeId,
      amount_minutes: minutes,
      balance_after: 0,
      type: 'SPENT',
      reason: null,
      was_override: false,
    })
    .select()
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to log screen time')
  }

  return data
}

export interface ScreenTimeLifecycleFamilyOverviewMember {
  member: { id: string; name: string; avatar_url: string | null }
  allowances: unknown[]
  stats: { totalMinutes: number; byType: Record<string, number>; sessionCount: number }
}

export async function getScreenTimeLifecycleFamilyOverview(): Promise<
  ScreenTimeLifecycleFamilyOverviewMember[]
> {
  const viewer = await requireParentContext('Unauthorized - Parent access required')
  const supabase = await createClient()

  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('id, name, avatar_url')
    .eq('family_id', viewer.familyId)
    .eq('is_active', true)

  if (membersError) {
    throw membersError
  }

  if (!members || members.length === 0) {
    return []
  }

  const memberIds = members.map((member) => member.id)
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const endDate = new Date().toISOString()

  const [allowancesResult, transactionsResult] = await Promise.all([
    supabase
      .from('screen_time_allowances')
      .select('*, screen_type:screen_time_types(id, name)')
      .in('member_id', memberIds)
      .order('screen_time_type_id'),
    supabase
      .from('screen_time_transactions')
      .select('member_id, amount_minutes, type, screen_type:screen_time_types(name)')
      .in('member_id', memberIds)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
  ])

  if (allowancesResult.error) {
    throw allowancesResult.error
  }
  if (transactionsResult.error) {
    throw transactionsResult.error
  }

  const allowancesByMemberId = (allowancesResult.data ?? []).reduce<Record<string, unknown[]>>(
    (acc, allowance) => {
      const memberId = (allowance as { member_id?: string }).member_id
      if (!memberId) return acc
      if (!acc[memberId]) acc[memberId] = []
      acc[memberId].push(allowance)
      return acc
    },
    {}
  )

  const statsByMemberId = memberIds.reduce<
    Record<string, { totalMinutes: number; byType: Record<string, number>; sessionCount: number }>
  >(
    (acc, memberId) => {
      acc[memberId] = { totalMinutes: 0, byType: {}, sessionCount: 0 }
      return acc
    },
    {}
  )

  for (const transaction of transactionsResult.data ?? []) {
    const t = transaction as {
      member_id?: string
      amount_minutes?: number | null
      type?: string | null
      screen_type?: { name?: string | null } | null
    }
    if (!t.member_id || t.type !== 'SPENT') continue
    const minutes = Math.abs(t.amount_minutes ?? 0)
    const typeName = t.screen_type?.name || 'Unknown'
    const stats = statsByMemberId[t.member_id]
    if (!stats) continue
    stats.totalMinutes += minutes
    stats.byType[typeName] = (stats.byType[typeName] ?? 0) + minutes
    stats.sessionCount += 1
  }

  return members.map((member) => ({
    member,
    allowances: allowancesByMemberId[member.id] ?? [],
    stats: statsByMemberId[member.id] ?? { totalMinutes: 0, byType: {}, sessionCount: 0 },
  }))
}
