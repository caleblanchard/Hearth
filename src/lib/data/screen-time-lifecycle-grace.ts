import { createClient } from '@/lib/supabase/server'
import {
  LifecycleError,
  readNumber,
  readString,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { checkGraceEligibility, getOrCreateGraceSettings } from '@/lib/data/screentime-grace'
import { sanitizeString } from '@/lib/input-sanitization'
import type {
  RequestScreenTimeLifecycleGraceInput,
  ScreenTimeLifecycleGraceLog,
  ScreenTimeLifecycleGraceRequestResult,
  ScreenTimeLifecycleGraceSettings,
  ScreenTimeLifecycleGraceStatus,
  UpdateScreenTimeLifecycleGraceSettingsInput,
} from '@/types/screen-time-lifecycle'
import {
  buildNextResetTime,
  ensureBalanceRow,
  ensureNonNegativeNumber,
  loadOwnedMember,
  normalizeGraceLog,
  normalizeGraceSettings,
  requireViewerAccessToMember,
  type GraceLogRowLike,
  type GracePeriodLogInsert,
  type GracePeriodLogUpdate,
  type RepaymentStatus,
  type ScreenTimeGraceSettingsInsert,
  type ScreenTimeGraceSettingsRow,
  type ScreenTimeGraceSettingsUpdate,
  type ScreenTimeTransactionInsert,
} from './screen-time-lifecycle-shared'

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
  const graceLogResult = await supabase
    .from('grace_period_logs')
    .select(`
      *,
      member:family_members!grace_period_logs_member_id_fkey(id, family_id, name)
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

  await loadOwnedMember(approverMemberId, member.family_id)

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
