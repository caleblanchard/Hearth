import { createClient } from '@/lib/supabase/server'
import { calculateRemainingTime } from '@/lib/screentime-utils'
import { sanitizeString } from '@/lib/input-sanitization'
import {
  LifecycleError,
  requireParentContext,
  writeAuditLog,
} from '@/lib/data/lifecycle-core'
import type {
  AdjustScreenTimeLifecycleBalanceInput,
  SaveScreenTimeLifecycleAllowanceInput,
  ScreenTimeLifecycleAdjustmentResult,
  ScreenTimeLifecycleAllowanceListQuery,
  ScreenTimeLifecycleAllowanceListResult,
  ScreenTimeLifecycleAllowanceRecord,
  ScreenTimeLifecycleAllowanceWithRemainingRecord,
  ScreenTimeLifecycleMemberAllowanceResult,
} from '@/types/screen-time-lifecycle'
import {
  ensureBalanceRow,
  ensureNonNegativeNumber,
  ensureValidPeriod,
  loadOwnedMember,
  loadOwnedType,
  normalizeAllowance,
  normalizeMemberSummary,
  requireViewerAccessToMember,
  type AllowanceRowLike,
  type AuditAction,
  type MemberRow,
  type ScreenTimeAllowanceInsert,
  type ScreenTimeTransactionInsert,
} from './screen-time-lifecycle-shared'

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

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'SCREENTIME_ADJUSTED' satisfies AuditAction,
    entityType: 'SCREENTIME_ALLOWANCE',
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
