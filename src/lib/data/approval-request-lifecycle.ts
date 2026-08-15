import { createClient } from '@/lib/supabase/server'
import { requireParentAuthorizationContext } from '@/lib/auth/parent-authorization-context'
import {
  insertAuditLog,
  LifecycleError,
  readDateString,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from '@/lib/data/lifecycle-core'
import type { AuditAction, AuditResult } from '@/lib/data/lifecycle-core'
import { approveChore, rejectChore } from '@/lib/data/chores'
import {
  approveRedemption,
  getPendingRedemptions,
  rejectRedemption,
} from '@/lib/data/credits'
import {
  approveScreenTimeLifecycleGrace,
  rejectScreenTimeLifecycleGrace,
} from '@/lib/data/screen-time-lifecycle'
import { logger } from '@/lib/logger'
import type {
  ApprovalRequestDecisionInput,
  ApprovalRequestDecisionResult,
  ApprovalRequestItem,
  ApprovalRequestLifecycleOptions,
  ApprovalRequestListQuery,
  ApprovalRequestListResult,
  ApprovalRequestPriority,
  ApprovalRequestStats,
  ApprovalRequestType,
  ApprovedChoreCompletionResult,
  GraceApprovalDecisionResult,
  PendingGraceApprovalRecord,
  PendingRewardRedemptionRecord,
  RewardRedemptionDecisionResult,
} from '@/types/approval-request-lifecycle'

type LifecycleContext = {
  familyId: string
  memberId: string
  memberName: string | null
}

type ApprovalIdDescriptor = {
  originalId: string
  sourceId: string
  type: ApprovalRequestType | null
}

type RawApprovalRow = Record<string, unknown>
type ApproveChoreResult = {
  success?: boolean
  error?: string
  completion?: unknown
  credits_awarded?: number
}

const APPROVAL_ID_PREFIXES: Record<ApprovalRequestType, string> = {
  CHORE_COMPLETION: 'chore',
  REWARD_REDEMPTION: 'reward',
  SHOPPING_ITEM: 'shopping',
}

function readFamilyId(record: Record<string, unknown>): string {
  return readString(record.family_id ?? record.familyId)
}

function createApprovalRequestId(type: ApprovalRequestType, sourceId: string): string {
  return `${APPROVAL_ID_PREFIXES[type]}-${sourceId}`
}

function parseApprovalRequestId(itemId: string): ApprovalIdDescriptor {
  const match = (Object.entries(APPROVAL_ID_PREFIXES) as Array<
    [ApprovalRequestType, string]
  >).find(([, prefix]) => itemId.startsWith(`${prefix}-`))

  if (!match) {
    return {
      originalId: itemId,
      sourceId: itemId,
      type: null,
    }
  }

  const [type, prefix] = match
  return {
    originalId: itemId,
    sourceId: itemId.slice(prefix.length + 1),
    type,
  }
}

async function requireLifecycleContext(
  options: ApprovalRequestLifecycleOptions = {}
): Promise<LifecycleContext> {
  const context = await requireParentAuthorizationContext(options)

  return {
    familyId: context.familyId,
    memberId: context.memberId,
    memberName: context.activeMembership?.name ?? null,
  }
}

function mapChoreApprovalItem(row: RawApprovalRow): ApprovalRequestItem | null {
  const assignedTo = readObject(row.assignedTo ?? row.assigned_to)
  const schedule = readObject(row.choreSchedule ?? row.chore_schedule)
  const definition = readObject(schedule.choreDefinition ?? schedule.chore_definition)
  const sourceId = readString(row.id)

  if (!sourceId) return null

  const photoUrl = readNullableString(row.photo_url ?? row.photoUrl)

  return {
    id: createApprovalRequestId('CHORE_COMPLETION', sourceId),
    type: 'CHORE_COMPLETION',
    familyMemberId: readString(assignedTo.id ?? row.assigned_to_id ?? row.assignedToId),
    familyMemberName: readString(assignedTo.name),
    familyMemberAvatarUrl: readNullableString(
      assignedTo.avatar_url ?? assignedTo.avatarUrl
    ),
    title: readString(definition.name) || 'Chore',
    description: readNullableString(row.notes) ?? '',
    requestedAt: readDateString(row.completed_at ?? row.completedAt),
    metadata: {
      credits: readNumber(definition.credit_value ?? definition.creditValue),
      notes: readNullableString(row.notes),
      photoUrl,
    },
    priority: photoUrl ? 'HIGH' : 'NORMAL',
    actionable: true,
  }
}

function mapRewardApprovalItem(row: RawApprovalRow): ApprovalRequestItem | null {
  const member = readObject(row.member)
  const reward = readObject(row.reward)
  const sourceId = readString(row.id)

  if (!sourceId) return null

  const requestedAt = readDateString(row.requested_at ?? row.requestedAt)
  const costCredits = readNumber(reward.cost_credits ?? reward.costCredits)
  const hoursOld =
    (Date.now() - new Date(requestedAt).getTime()) / (1000 * 60 * 60)

  return {
    id: createApprovalRequestId('REWARD_REDEMPTION', sourceId),
    type: 'REWARD_REDEMPTION',
    familyMemberId: readString(member.id ?? row.member_id ?? row.memberId),
    familyMemberName: readString(member.name),
    familyMemberAvatarUrl: readNullableString(
      member.avatar_url ?? member.avatarUrl
    ),
    title: readString(reward.name) || 'Reward',
    description: readNullableString(row.notes) ?? '',
    requestedAt,
    metadata: {
      costCredits,
    },
    priority: hoursOld >= 24 || costCredits >= 100 ? 'HIGH' : 'NORMAL',
    actionable: true,
  }
}

function mapShoppingApprovalItem(row: RawApprovalRow): ApprovalRequestItem | null {
  const requestedBy = readObject(row.requestedBy ?? row.requested_by)
  const sourceId = readString(row.id)

  if (!sourceId) return null

  return {
    id: createApprovalRequestId('SHOPPING_ITEM', sourceId),
    type: 'SHOPPING_ITEM',
    familyMemberId: readString(requestedBy.id ?? row.requested_by ?? row.requestedById),
    familyMemberName: readString(requestedBy.name),
    familyMemberAvatarUrl: readNullableString(
      requestedBy.avatar_url ?? requestedBy.avatarUrl
    ),
    title: readString(row.name) || 'Shopping request',
    description: '',
    requestedAt: readDateString(row.created_at ?? row.createdAt),
    metadata: {},
    priority: 'NORMAL',
    actionable: false,
  }
}

async function fetchPendingChoreRows(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await (supabase as any)
    .from('chore_instances')
    .select(`
      *,
      assignedTo:family_members!chore_instances_assigned_to_id_fkey(id, name, avatar_url),
      choreSchedule:chore_schedules(
        choreDefinition:chore_definitions(name, credit_value, family_id)
      )
    `)
    .eq('status', 'COMPLETED')

  if (error) throw error
  return (data ?? []) as RawApprovalRow[]
}

async function fetchPendingRewardRows(
  familyId: string
) {
  const rows = await getPendingRedemptions(familyId)
  return rows as RawApprovalRow[]
}

async function fetchPendingShoppingRows(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await (supabase as any)
    .from('shopping_items')
    .select(`
      *,
      requestedBy:family_members(id, name, avatar_url)
    `)
    .eq('status', 'PENDING')

  if (error) throw error
  return (data ?? []) as RawApprovalRow[]
}

function filterByFamily(
  rows: RawApprovalRow[],
  familyId: string,
  reader: (row: RawApprovalRow) => string
): RawApprovalRow[] {
  return rows.filter((row) => {
    const rowFamilyId = reader(row)
    return !rowFamilyId || rowFamilyId === familyId
  })
}

async function buildApprovalQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string
): Promise<ApprovalRequestItem[]> {
  const [choreRows, rewardRows, shoppingRows] = await Promise.all([
    fetchPendingChoreRows(supabase),
    fetchPendingRewardRows(familyId),
    fetchPendingShoppingRows(supabase),
  ])

  const approvals = [
    ...filterByFamily(choreRows, familyId, (row) =>
      readFamilyId(
        readObject(
          readObject(row.choreSchedule ?? row.chore_schedule).choreDefinition ??
            readObject(row.choreSchedule ?? row.chore_schedule).chore_definition
        )
      )
    )
      .map((row) => mapChoreApprovalItem(row))
      .filter((row): row is ApprovalRequestItem => Boolean(row)),
    ...filterByFamily(rewardRows, familyId, (row) =>
      readFamilyId(readObject(row.reward))
    )
      .map((row) => mapRewardApprovalItem(row))
      .filter((row): row is ApprovalRequestItem => Boolean(row)),
    ...filterByFamily(shoppingRows, familyId, (row) =>
      readFamilyId(row)
    )
      .map((row) => mapShoppingApprovalItem(row))
      .filter((row): row is ApprovalRequestItem => Boolean(row)),
  ]

  return approvals.sort(
    (left, right) =>
      new Date(left.requestedAt).getTime() - new Date(right.requestedAt).getTime()
  )
}

async function loadRewardRedemptionRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  redemptionId: string
) {
  const { data, error } = await (supabase as any)
    .from('reward_redemptions')
    .select(`
      *,
      reward:reward_items!inner(*),
      member:family_members!member_id(id, name, avatar_url)
    `)
    .eq('id', redemptionId)
    .single()

  if (error && !data) return null
  return (data ?? null) as RawApprovalRow | null
}

async function loadPendingGraceRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string
) {
  const { data, error } = await (supabase as any)
    .from('grace_period_logs')
    .select(`
      *,
      member:family_members(id, name, family_id)
    `)
    .is('approved_by_id', null)
    .eq('repayment_status', 'PENDING')
    .order('requested_at', { ascending: true })

  if (error) throw error

  const filtered = ((data ?? []) as RawApprovalRow[]).filter((row) => {
    const member = readObject(row.member)
    return readFamilyId(member) === familyId
  })

  return Promise.all(
    filtered.map(async (row) => {
      const memberId = readString(row.member_id ?? row.memberId)
      const { data: balance } = await (supabase as any)
        .from('screen_time_balances')
        .select('*')
        .eq('member_id', memberId)
        .single()

      const member = readObject(row.member)

      return {
        id: readString(row.id),
        memberId,
        memberName: readString(member.name),
        minutesGranted: readNumber(row.minutes_granted ?? row.minutesGranted),
        reason: readNullableString(row.reason),
        requestedAt: readDateString(row.requested_at ?? row.requestedAt),
        currentBalance: readNumber(
          readObject(balance ?? {}).current_balance_minutes
        ),
      } satisfies PendingGraceApprovalRecord
    })
  )
}

async function writeAuditLog(entry: {
  familyId: string
  memberId: string
  action: AuditAction
  entityType: string
  entityId: string
  result?: AuditResult
  metadata?: Record<string, unknown>
}) {
  try {
    await insertAuditLog(entry)
  } catch (error) {
    logger.warn('Failed to write approval lifecycle audit log')
  }
}

function assertFamilyOwnership(
  row: RawApprovalRow | null,
  familyId: string,
  reader: (row: RawApprovalRow) => string,
  notFoundMessage: string,
  forbiddenMessage = 'Forbidden'
) {
  if (!row) {
    throw new LifecycleError(404, notFoundMessage)
  }

  if (reader(row) !== familyId) {
    throw new LifecycleError(403, forbiddenMessage)
  }
}

export async function listApprovalRequests(
  query: ApprovalRequestListQuery
): Promise<ApprovalRequestListResult> {
  const context = await requireLifecycleContext()
  const supabase = await createClient()
  const approvals = await buildApprovalQueue(supabase, context.familyId)

  const filtered = approvals.filter((approval) => {
    if (query.type && query.type !== 'ALL' && approval.type !== query.type) {
      return false
    }

    if (query.memberId && approval.familyMemberId !== query.memberId) {
      return false
    }

    return true
  })

  return {
    approvals: filtered,
    total: filtered.length,
  }
}

export async function getApprovalRequestStats(): Promise<ApprovalRequestStats> {
  const context = await requireLifecycleContext()
  const supabase = await createClient()
  const approvals = await buildApprovalQueue(supabase, context.familyId)

  const byPriority = approvals.reduce(
    (summary, approval) => {
      const key = approval.priority.toLowerCase() as 'high' | 'normal' | 'low'
      summary[key] += 1
      return summary
    },
    { high: 0, normal: 0, low: 0 }
  )

  return {
    total: approvals.length,
    byType: {
      choreCompletions: approvals.filter(
        (approval) => approval.type === 'CHORE_COMPLETION'
      ).length,
      rewardRedemptions: approvals.filter(
        (approval) => approval.type === 'REWARD_REDEMPTION'
      ).length,
      shoppingRequests: approvals.filter(
        (approval) => approval.type === 'SHOPPING_ITEM'
      ).length,
      calendarRequests: 0,
    },
    byPriority,
    oldestPending: approvals[0]
      ? new Date(approvals[0].requestedAt).toISOString()
      : undefined,
  }
}

async function approveQueueChoreRequest(
  context: LifecycleContext,
  itemId: string,
  sourceId: string
) {
  const result = (await approveChore(sourceId, context.memberId)) as ApproveChoreResult

  if (!result || !result.success) {
    throw new LifecycleError(
      400,
      result?.error || 'Failed to approve chore'
    )
  }

  return itemId
}

async function denyQueueChoreRequest(
  context: LifecycleContext,
  itemId: string,
  sourceId: string
) {
  await rejectChore(sourceId, context.memberId)
  return itemId
}

async function approveQueueRewardRequest(
  context: LifecycleContext,
  itemId: string,
  sourceId: string
) {
  await approveRewardRedemptionRequest(sourceId, {
    forbiddenMessage: 'Only parents can approve items',
  })
  return itemId
}

async function denyQueueRewardRequest(
  context: LifecycleContext,
  itemId: string,
  sourceId: string
) {
  await rejectRewardRedemptionRequest(sourceId, undefined, {
    forbiddenMessage: 'Only parents can deny items',
  })
  return itemId
}

export async function processApprovalRequests(
  input: ApprovalRequestDecisionInput
): Promise<ApprovalRequestDecisionResult> {
  const context = await requireLifecycleContext({
    forbiddenMessage:
      input.decision === 'APPROVE'
        ? 'Only parents can approve items'
        : 'Only parents can deny items',
  })

  const success: string[] = []
  const failed: ApprovalRequestDecisionResult['failed'] = []

  for (const itemId of input.itemIds) {
    const descriptor = parseApprovalRequestId(itemId)

    try {
      if (descriptor.type === 'SHOPPING_ITEM') {
        throw new LifecycleError(
          400,
          'Shopping requests are read-only'
        )
      }

      if (descriptor.type === 'CHORE_COMPLETION') {
        success.push(
          input.decision === 'APPROVE'
            ? await approveQueueChoreRequest(
                context,
                descriptor.originalId,
                descriptor.sourceId
              )
            : await denyQueueChoreRequest(
                context,
                descriptor.originalId,
                descriptor.sourceId
              )
        )
        continue
      }

      if (descriptor.type === 'REWARD_REDEMPTION') {
        success.push(
          input.decision === 'APPROVE'
            ? await approveQueueRewardRequest(
                context,
                descriptor.originalId,
                descriptor.sourceId
              )
            : await denyQueueRewardRequest(
                context,
                descriptor.originalId,
                descriptor.sourceId
              )
        )
        continue
      }

      try {
        success.push(
          input.decision === 'APPROVE'
            ? await approveQueueChoreRequest(context, itemId, itemId)
            : await denyQueueChoreRequest(context, itemId, itemId)
        )
      } catch {
        success.push(
          input.decision === 'APPROVE'
            ? await approveQueueRewardRequest(context, itemId, itemId)
            : await denyQueueRewardRequest(context, itemId, itemId)
        )
      }
    } catch (error) {
      failed.push({
        itemId,
        reason:
          error instanceof Error ? error.message : 'Failed to process approval item',
      })
    }
  }

  return {
    success,
    failed,
    total: input.itemIds.length,
  }
}

export async function listPendingRewardRedemptionRequests(
  options: ApprovalRequestLifecycleOptions = {}
): Promise<PendingRewardRedemptionRecord[]> {
  const context = await requireLifecycleContext(options)
  const rows = (await getPendingRedemptions(context.familyId)) as RawApprovalRow[]

  return rows.map((row) => {
    const reward = readObject(row.reward)
    const member = readObject(row.member)

    return {
      id: readString(row.id),
      status: readString(row.status),
      requestedAt: readDateString(row.requested_at ?? row.requestedAt),
      notes: readNullableString(row.notes) ?? undefined,
      reward: {
        id: readString(reward.id),
        name: readString(reward.name),
        description: readNullableString(reward.description) ?? undefined,
        costCredits: readNumber(reward.cost_credits ?? reward.costCredits),
        category: readString(reward.category),
      },
      member: {
        id: readString(member.id),
        name: readString(member.name),
        avatarUrl:
          readNullableString(member.avatar_url ?? member.avatarUrl) ?? undefined,
      },
    }
  })
}

export async function approveRewardRedemptionRequest(
  redemptionId: string,
  options: ApprovalRequestLifecycleOptions = {}
): Promise<RewardRedemptionDecisionResult> {
  const context = await requireLifecycleContext(options)
  const supabase = await createClient()
  const redemption = await loadRewardRedemptionRow(supabase, redemptionId)

  assertFamilyOwnership(
    redemption,
    context.familyId,
    (row) => readFamilyId(readObject(row.reward)),
    'Redemption not found',
    options.forbiddenMessage ?? 'Forbidden'
  )

  const redemptionRecord = redemption as RawApprovalRow

  if (readString(redemptionRecord.status) !== 'PENDING') {
    throw new LifecycleError(
      400,
      'This redemption has already been processed'
    )
  }

  const approved = await approveRedemption(redemptionId, context.memberId)

  await (supabase as any).from('notifications').insert({
    user_id: readString(redemptionRecord.memberId ?? redemptionRecord.member_id),
    type: 'REWARD_APPROVED',
    title: 'Reward approved!',
    message: `Your reward "${readString(readObject(redemptionRecord.reward).name)}" has been approved!`,
    action_url: '/dashboard/rewards/redemptions',
    metadata: {
      redemptionId,
      rewardName: readString(readObject(redemptionRecord.reward).name),
      approvedBy: context.memberName,
    },
  })

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'REWARD_APPROVED',
    entityType: 'REWARD',
    entityId: redemptionId,
    result: 'SUCCESS',
    metadata: {
      rewardName: readString(readObject(redemptionRecord.reward).name),
      memberName: readString(readObject(redemptionRecord.member).name),
    },
  })

  return {
    redemption: approved,
    message: `Approved ${readString(readObject(redemptionRecord.member).name)}'s redemption of "${readString(readObject(redemptionRecord.reward).name)}"`,
  }
}

export async function rejectRewardRedemptionRequest(
  redemptionId: string,
  reason?: string,
  options: ApprovalRequestLifecycleOptions = {}
): Promise<RewardRedemptionDecisionResult> {
  const context = await requireLifecycleContext(options)
  const supabase = await createClient()
  const redemption = await loadRewardRedemptionRow(supabase, redemptionId)

  assertFamilyOwnership(
    redemption,
    context.familyId,
    (row) => readFamilyId(readObject(row.reward)),
    'Redemption not found',
    options.forbiddenMessage ?? 'Forbidden'
  )

  const redemptionRecord = redemption as RawApprovalRow

  if (readString(redemptionRecord.status) !== 'PENDING') {
    throw new LifecycleError(
      400,
      'This redemption has already been processed'
    )
  }

  const rejectionReason = reason?.trim() || 'No reason provided'
  const rejected = await rejectRedemption(
    redemptionId,
    context.memberId,
    rejectionReason
  )

  await (supabase as any).from('notifications').insert({
    user_id: readString(redemptionRecord.memberId ?? redemptionRecord.member_id),
    type: 'REWARD_REJECTED',
    title: 'Reward declined',
    message: `Your reward "${readString(readObject(redemptionRecord.reward).name)}" was not approved.`,
    action_url: '/dashboard/rewards',
    metadata: {
      redemptionId,
      rewardName: readString(readObject(redemptionRecord.reward).name),
      creditsRefunded: readNumber(
        readObject(redemptionRecord.reward).cost_credits ??
          readObject(redemptionRecord.reward).costCredits
      ),
      rejectionReason,
      rejectedBy: context.memberName,
    },
  })

  await writeAuditLog({
    familyId: context.familyId,
    memberId: context.memberId,
    action: 'REWARD_REJECTED',
    entityType: 'REWARD',
    entityId: redemptionId,
    result: 'DENIED',
    metadata: {
      rewardName: readString(readObject(redemptionRecord.reward).name),
      memberName: readString(readObject(redemptionRecord.member).name),
      rejectionReason,
    },
  })

  return {
    redemption: rejected,
    message: 'Redemption rejected successfully',
  }
}

export async function approveChoreCompletionRequest(
  completionId: string,
  options: ApprovalRequestLifecycleOptions = {}
): Promise<ApprovedChoreCompletionResult> {
  const context = await requireLifecycleContext(options)
  const result = (await approveChore(
    completionId,
    context.memberId
  )) as ApproveChoreResult

  if (!result || !result.success) {
    throw new LifecycleError(
      400,
      result?.error || 'Failed to approve chore'
    )
  }

  return {
    completion: result.completion,
    creditsAwarded: readNumber(result.credits_awarded),
    message: 'Chore approved successfully',
  }
}

export async function decideGraceApprovalRequest(
  graceLogId: string,
  approved: boolean,
  options: ApprovalRequestLifecycleOptions = {}
): Promise<GraceApprovalDecisionResult> {
  const context = await requireLifecycleContext(options)
  const graceLog = approved
    ? await approveScreenTimeLifecycleGrace(graceLogId, context.memberId)
    : await rejectScreenTimeLifecycleGrace(graceLogId, context.memberId)

  return {
    graceLog,
    message: approved ? 'Grace period approved' : 'Grace period rejected',
  }
}

export async function listPendingChoreCompletionRequests(
  options: ApprovalRequestLifecycleOptions = {}
): Promise<RawApprovalRow[]> {
  const context = await requireLifecycleContext(options)
  const supabase = await createClient()
  const rows = await fetchPendingChoreRows(supabase)

  return filterByFamily(rows, context.familyId, (row) =>
    readFamilyId(
      readObject(
        readObject(row.choreSchedule ?? row.chore_schedule).choreDefinition ??
          readObject(row.choreSchedule ?? row.chore_schedule).chore_definition
      )
    )
  )
}

export async function listPendingGraceApprovalRequests(
  options: ApprovalRequestLifecycleOptions = {}
): Promise<PendingGraceApprovalRecord[]> {
  const context = await requireLifecycleContext(options)
  const supabase = await createClient()

  return loadPendingGraceRows(supabase, context.familyId)
}
