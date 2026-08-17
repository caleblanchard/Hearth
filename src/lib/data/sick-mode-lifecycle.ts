import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  LifecycleError,
  readString,
  readNullableString,
  readBoolean,
  requireParentContext,
  requireViewerContext,
  writeAuditLog,
} from '@/lib/data/lifecycle-core'
import type { Database } from '@/lib/database.types'
import type {
  EndSickModeLifecycleResult,
  ListSickModeLifecycleInstancesQuery,
  ListSickModeLifecycleInstancesResult,
  SickModeLifecycleInstanceRecord,
  SickModeLifecycleSettingsRecord,
  StartSickModeLifecycleInput,
  StartSickModeLifecycleResult,
} from '@/types/sick-mode-lifecycle'

type SickModeInstanceRow = Database['public']['Tables']['sick_mode_instances']['Row']
type SickModeInstanceInsert = Database['public']['Tables']['sick_mode_instances']['Insert']
type SickModeSettingsRow = Database['public']['Tables']['sick_mode_settings']['Row']
type SickModeTrigger = Database['public']['Enums']['sick_mode_trigger']

type SickModeInstanceRowLike = SickModeInstanceRow &
  Record<string, unknown> & {
    member?: Record<string, unknown> | null
  }

function normalizeSickModeSettings(row: SickModeSettingsRow): SickModeLifecycleSettingsRecord {
  return {
    id: row.id,
    familyId: row.family_id,
    autoEnableOnTemperature: row.auto_enable_on_temperature,
    temperatureThreshold: Number(row.temperature_threshold),
    autoDisableAfter24Hours: row.auto_disable_after_24_hours,
    pauseChores: row.pause_chores,
    pauseScreenTimeTracking: row.pause_screen_time_tracking,
    screenTimeBonus: row.screen_time_bonus,
    skipMorningRoutine: row.skip_morning_routine,
    skipBedtimeRoutine: row.skip_bedtime_routine,
    muteNonEssentialNotifs: row.mute_non_essential_notifs,
  }
}

function normalizeSickModeInstance(
  row: SickModeInstanceRowLike
): SickModeLifecycleInstanceRecord {
  const memberRecord =
    row.member && typeof row.member === 'object' && !Array.isArray(row.member)
      ? (row.member as Record<string, unknown>)
      : null

  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    isActive: row.is_active,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    endedById: row.ended_by_id,
    triggeredBy: row.triggered_by,
    healthEventId: row.health_event_id,
    notes: row.notes,
    member: memberRecord
      ? {
          id: readString(memberRecord.id),
          name: readString(memberRecord.name, 'Family member'),
        }
      : null,
  }
}

async function getOwnedMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  familyId: string
) {
  const { data: member, error } = await supabase
    .from('family_members')
    .select('id, family_id, name')
    .eq('id', memberId)
    .single()

  if (error) {
    logger.error('Error loading sick mode lifecycle member:', error)
    throw new LifecycleError(500, 'Failed to load family member')
  }

  if (!member || member.family_id !== familyId) {
    throw new LifecycleError(404, 'Member not found')
  }

  return member
}

async function getOwnedInstanceRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instanceId: string,
  familyId: string
) {
  const { data: instance, error } = await supabase
    .from('sick_mode_instances')
    .select(`
      *,
      member:family_members!sick_mode_instances_member_id_fkey(id, name)
    `)
    .eq('id', instanceId)
    .single()

  if (error) {
    logger.error('Error loading sick mode lifecycle instance:', error)
    throw new LifecycleError(500, 'Failed to fetch sick mode status')
  }

  if (!instance || instance.family_id !== familyId) {
    throw new LifecycleError(404, 'Sick mode instance not found')
  }

  return instance as SickModeInstanceRowLike
}

async function getOrCreateSickModeSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string
) {
  const { data: settings, error } = await supabase
    .from('sick_mode_settings')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle()

  if (error) {
    logger.error('Error loading sick mode settings:', error)
    throw new LifecycleError(500, 'Failed to load sick mode settings')
  }

  if (settings) {
    return normalizeSickModeSettings(settings)
  }

  const { data: inserted, error: insertError } = await supabase
    .from('sick_mode_settings')
    .insert({ family_id: familyId })
    .select()
    .single()

  if (insertError || !inserted) {
    logger.error('Error creating default sick mode settings:', insertError)
    throw new LifecycleError(500, 'Failed to load sick mode settings')
  }

  return normalizeSickModeSettings(inserted)
}

export async function listSickModeLifecycleInstances(
  query: ListSickModeLifecycleInstancesQuery = {}
): Promise<ListSickModeLifecycleInstancesResult> {
  const { familyId } = await requireViewerContext()
  const supabase = await createClient()

  if (query.memberId) {
    await getOwnedMember(supabase, query.memberId, familyId)
  }

  let request = supabase
    .from('sick_mode_instances')
    .select(`
      *,
      member:family_members!sick_mode_instances_member_id_fkey(id, name)
    `)
    .eq('family_id', familyId)

  if (query.memberId) {
    request = request.eq('member_id', query.memberId)
  }

  if (!query.includeEnded) {
    request = request.eq('is_active', true)
  }

  const { data, error } = await request.order('started_at', { ascending: false })

  if (error) {
    logger.error('Error fetching sick mode status:', error)
    throw new LifecycleError(500, 'Failed to get sick mode status')
  }

  return {
    instances: (data ?? []).map((instance) =>
      normalizeSickModeInstance(instance as SickModeInstanceRowLike)
    ),
  }
}

export async function startSickModeLifecycle(
  input: StartSickModeLifecycleInput
): Promise<StartSickModeLifecycleResult> {
  const viewer = await requireViewerContext()
  const supabase = await createClient()

  if (!input.memberId) {
    throw new LifecycleError(400, 'Member ID is required')
  }

  if (input.memberId !== viewer.memberId && !viewer.isParent) {
    throw new LifecycleError(403, 'Children can only start sick mode for themselves')
  }

  await getOwnedMember(supabase, input.memberId, viewer.familyId)

  const { data: existingInstance, error: existingInstanceError } = await supabase
    .from('sick_mode_instances')
    .select('id')
    .eq('member_id', input.memberId)
    .eq('is_active', true)
    .maybeSingle()

  if (existingInstanceError) {
    logger.error('Error checking sick mode lifecycle active instance:', existingInstanceError)
    throw new LifecycleError(500, 'Failed to start sick mode')
  }

  if (existingInstance) {
    throw new LifecycleError(409, 'Sick mode is already active for this member')
  }

  const insert: SickModeInstanceInsert = {
    family_id: viewer.familyId,
    member_id: input.memberId,
    notes: input.notes ?? null,
    health_event_id: input.healthEventId ?? null,
    triggered_by: input.healthEventId ? 'AUTO_FROM_HEALTH_EVENT' : 'MANUAL',
    is_active: true,
  }

  const { data: instance, error } = await supabase
    .from('sick_mode_instances')
    .insert(insert)
    .select(`
      *,
      member:family_members!sick_mode_instances_member_id_fkey(id, name)
    `)
    .single()

  if (error || !instance) {
    logger.error('Error starting sick mode lifecycle:', error)
    throw new LifecycleError(500, 'Failed to start sick mode')
  }

  await writeAuditLog({
    familyId: viewer.familyId,
    memberId: viewer.memberId,
    action: 'SICK_MODE_STARTED',
    entityType: 'SICK_MODE_INSTANCE',
    entityId: instance.id,
    metadata: {
      sickMemberId: input.memberId,
      triggeredBy: insert.triggered_by,
      notes: input.notes ?? null,
    },
  })

  return {
    instance: normalizeSickModeInstance(instance as SickModeInstanceRowLike),
    settings: await getOrCreateSickModeSettings(supabase, viewer.familyId),
  }
}

export async function endSickModeLifecycle(
  instanceId: string
): Promise<EndSickModeLifecycleResult> {
  const viewer = await requireParentContext()
  const supabase = await createClient()

  if (!instanceId) {
    throw new LifecycleError(400, 'Instance ID is required')
  }

  const current = await getOwnedInstanceRow(supabase, instanceId, viewer.familyId)

  if (!readBoolean(current.is_active)) {
    throw new LifecycleError(409, 'Sick mode is already ended')
  }

  const { data: instance, error } = await supabase
    .from('sick_mode_instances')
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      ended_by_id: viewer.memberId,
    })
    .eq('id', instanceId)
    .select(`
      *,
      member:family_members!sick_mode_instances_member_id_fkey(id, name)
    `)
    .single()

  if (error || !instance) {
    logger.error('Error ending sick mode lifecycle:', error)
    throw new LifecycleError(500, 'Failed to end sick mode')
  }

  await writeAuditLog({
    familyId: viewer.familyId,
    memberId: viewer.memberId,
    action: 'SICK_MODE_ENDED',
    entityType: 'SICK_MODE_INSTANCE',
    entityId: instanceId,
    metadata: {
      sickMemberId: current.member_id,
    },
  })

  return {
    instance: normalizeSickModeInstance(instance as SickModeInstanceRowLike),
  }
}
