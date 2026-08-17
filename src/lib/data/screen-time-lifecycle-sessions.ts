import { createClient } from '@/lib/supabase/server'
import {
  LifecycleError,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { sanitizeInteger, sanitizeString } from '@/lib/input-sanitization'
import type { Database } from '@/lib/database.types'

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
