import { createClient } from '@/lib/supabase/server'
import {
  LifecycleError,
  readString,
  readNullableString,
  readNumber,
  readBoolean,
  requireParentContext,
} from '@/lib/data/lifecycle-core'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import type {
  AllowanceScheduleLifecycleListResult,
  AllowanceScheduleLifecycleMemberSummary,
  AllowanceScheduleLifecycleScheduleRecord,
  CreateAllowanceScheduleLifecycleInput,
  UpdateAllowanceScheduleLifecycleInput,
} from '@/types/allowance-schedule-lifecycle'

type AllowanceScheduleRow = Database['public']['Tables']['allowance_schedules']['Row']
type AllowanceScheduleInsert = Database['public']['Tables']['allowance_schedules']['Insert']
type AllowanceScheduleUpdate = Database['public']['Tables']['allowance_schedules']['Update']
type Frequency = Database['public']['Enums']['frequency']

type ScheduleRowLike = AllowanceScheduleRow &
  Record<string, unknown> & {
    member?: Record<string, unknown> | null
  }

function normalizeMemberSummary(member: unknown): AllowanceScheduleLifecycleMemberSummary {
  const record =
    member && typeof member === 'object' && !Array.isArray(member)
      ? (member as Record<string, unknown>)
      : {}

  return {
    id: readString(record.id),
    name: readString(record.name, 'Family member'),
    email: readNullableString(record.email),
  }
}

function normalizeAllowanceSchedule(
  row: ScheduleRowLike
): AllowanceScheduleLifecycleScheduleRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    amount: row.amount,
    frequency: row.frequency,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    isActive: row.is_active,
    isPaused: row.is_paused,
    startDate: row.start_date,
    endDate: row.end_date,
    lastProcessedAt: row.last_processed_at,
    member: normalizeMemberSummary(row.member),
  }
}

function ensurePositiveAmount(amount: number | undefined, required = false) {
  if (amount === undefined) {
    if (required) {
      throw new LifecycleError(400, 'Amount must be a positive number')
    }
    return
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new LifecycleError(400, 'Amount must be a positive number')
  }
}

function ensureFrequencySpecificFields(
  frequency: Frequency,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined
) {
  if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
    if (dayOfWeek === null || dayOfWeek === undefined) {
      throw new LifecycleError(
        400,
        'dayOfWeek is required for WEEKLY/BIWEEKLY frequency'
      )
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new LifecycleError(
        400,
        'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'
      )
    }
  }

  if (frequency === 'MONTHLY') {
    if (dayOfMonth === null || dayOfMonth === undefined) {
      throw new LifecycleError(400, 'dayOfMonth is required for MONTHLY frequency')
    }

    if (dayOfMonth < 1 || dayOfMonth > 31) {
      throw new LifecycleError(400, 'dayOfMonth must be between 1 and 31')
    }
  }
}

function parseOptionalDate(value: string | null | undefined, fieldName: string): string | null {
  if (value === undefined) {
    return null
  }

  if (value === null || value === '') {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new LifecycleError(400, `${fieldName} must be a valid date`)
  }

  return parsed.toISOString()
}

async function getOwnedMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  familyId: string
) {
  const { data: member, error } = await supabase
    .from('family_members')
    .select('id, family_id, name, email')
    .eq('id', memberId)
    .single()

  if (error) {
    logger.error('Error loading family member for allowance schedule lifecycle:', error)
    throw new LifecycleError(500, 'Failed to load family member')
  }

  if (!member || member.family_id !== familyId) {
    throw new LifecycleError(404, 'Family member not found')
  }

  return member
}

async function getOwnedScheduleRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string,
  familyId: string
) {
  const { data: schedule, error } = await supabase
    .from('allowance_schedules')
    .select(`
      *,
      member:family_members!inner(id, name, email, family_id)
    `)
    .eq('id', scheduleId)
    .single()

  if (error) {
    logger.error('Error loading allowance schedule lifecycle record:', error)
    throw new LifecycleError(500, 'Failed to fetch allowance schedule')
  }

  const memberRecord =
    schedule?.member && typeof schedule.member === 'object'
      ? (schedule.member as Record<string, unknown>)
      : null

  if (!schedule || readString(memberRecord?.family_id) !== familyId) {
    throw new LifecycleError(404, 'Allowance schedule not found')
  }

  return schedule as ScheduleRowLike
}

function buildCreateScheduleInsert(
  input: CreateAllowanceScheduleLifecycleInput
): AllowanceScheduleInsert {
  ensurePositiveAmount(input.amount, true)
  ensureFrequencySpecificFields(input.frequency, input.dayOfWeek, input.dayOfMonth)

  return {
    member_id: input.memberId,
    amount: input.amount,
    frequency: input.frequency,
    day_of_week:
      input.frequency === 'WEEKLY' || input.frequency === 'BIWEEKLY'
        ? input.dayOfWeek ?? null
        : null,
    day_of_month: input.frequency === 'MONTHLY' ? input.dayOfMonth ?? null : null,
    is_active: true,
    is_paused: false,
    start_date: parseOptionalDate(input.startDate, 'startDate') ?? new Date().toISOString(),
    end_date: parseOptionalDate(input.endDate, 'endDate'),
  }
}

function buildUpdateSchedulePatch(
  input: UpdateAllowanceScheduleLifecycleInput,
  current: ScheduleRowLike
): AllowanceScheduleUpdate {
  ensurePositiveAmount(input.amount)

  const frequency = input.frequency ?? current.frequency
  const dayOfWeek = input.dayOfWeek !== undefined ? input.dayOfWeek : current.day_of_week
  const dayOfMonth = input.dayOfMonth !== undefined ? input.dayOfMonth : current.day_of_month

  ensureFrequencySpecificFields(frequency, dayOfWeek, dayOfMonth)

  const updates: AllowanceScheduleUpdate = {}

  if (input.amount !== undefined) {
    updates.amount = input.amount
  }

  if (input.frequency !== undefined) {
    updates.frequency = input.frequency
  }

  updates.day_of_week =
    frequency === 'WEEKLY' || frequency === 'BIWEEKLY' ? dayOfWeek ?? null : null
  updates.day_of_month = frequency === 'MONTHLY' ? dayOfMonth ?? null : null

  if (input.startDate !== undefined) {
    const parsedStart = parseOptionalDate(input.startDate, 'startDate')
    if (!parsedStart) {
      throw new LifecycleError(400, 'startDate must be a valid date')
    }
    updates.start_date = parsedStart
  }

  if (input.endDate !== undefined) {
    updates.end_date = parseOptionalDate(input.endDate, 'endDate')
  }

  return updates
}

export async function listAllowanceScheduleLifecycleSchedules(): Promise<AllowanceScheduleLifecycleListResult> {
  const { familyId } = await requireParentContext()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('allowance_schedules')
    .select(`
      *,
      member:family_members!inner(id, name, email, family_id)
    `)
    .eq('member.family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching allowance schedules:', error)
    throw new LifecycleError(500, 'Failed to fetch allowance schedules')
  }

  return {
    schedules: (data ?? []).map((row) =>
      normalizeAllowanceSchedule(row as ScheduleRowLike)
    ),
  }
}

export async function getAllowanceScheduleLifecycleSchedule(scheduleId: string) {
  const { familyId } = await requireParentContext()
  const supabase = await createClient()
  const schedule = await getOwnedScheduleRow(supabase, scheduleId, familyId)
  return normalizeAllowanceSchedule(schedule)
}

export async function createAllowanceScheduleLifecycleSchedule(
  input: CreateAllowanceScheduleLifecycleInput
) {
  if (!input.memberId) {
    throw new LifecycleError(400, 'Member ID is required')
  }

  const insert = buildCreateScheduleInsert(input)
  const { familyId } = await requireParentContext()
  const supabase = await createClient()

  await getOwnedMember(supabase, input.memberId, familyId)

  const { data: existingSchedule, error: existingScheduleError } = await supabase
    .from('allowance_schedules')
    .select('id')
    .eq('member_id', input.memberId)
    .eq('is_active', true)
    .maybeSingle()

  if (existingScheduleError) {
    logger.error('Error checking active allowance schedules:', existingScheduleError)
    throw new LifecycleError(500, 'Failed to create allowance schedule')
  }

  if (existingSchedule) {
    throw new LifecycleError(
      409,
      'This member already has an active allowance schedule'
    )
  }

  const { data: schedule, error } = await supabase
    .from('allowance_schedules')
    .insert(insert)
    .select(`
      *,
      member:family_members(id, name, email)
    `)
    .single()

  if (error || !schedule) {
    logger.error('Error creating allowance schedule:', error)
    throw new LifecycleError(500, 'Failed to create allowance schedule')
  }

  return normalizeAllowanceSchedule(schedule as ScheduleRowLike)
}

export async function updateAllowanceScheduleLifecycleSchedule(
  scheduleId: string,
  input: UpdateAllowanceScheduleLifecycleInput
) {
  const { familyId } = await requireParentContext()
  const supabase = await createClient()
  const current = await getOwnedScheduleRow(supabase, scheduleId, familyId)
  const updates = buildUpdateSchedulePatch(input, current)

  const { data: schedule, error } = await supabase
    .from('allowance_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select(`
      *,
      member:family_members(id, name, email)
    `)
    .single()

  if (error || !schedule) {
    logger.error('Error updating allowance schedule:', error)
    throw new LifecycleError(500, 'Failed to update allowance schedule')
  }

  return normalizeAllowanceSchedule(schedule as ScheduleRowLike)
}

export async function setAllowanceScheduleLifecyclePaused(
  scheduleId: string,
  isPaused: boolean
) {
  const { familyId } = await requireParentContext()
  const supabase = await createClient()
  await getOwnedScheduleRow(supabase, scheduleId, familyId)

  const { data: schedule, error } = await supabase
    .from('allowance_schedules')
    .update({ is_paused: isPaused })
    .eq('id', scheduleId)
    .select(`
      *,
      member:family_members(id, name, email)
    `)
    .single()

  if (error || !schedule) {
    logger.error('Error updating allowance schedule pause state:', error)
    throw new LifecycleError(500, 'Failed to update allowance schedule')
  }

  return normalizeAllowanceSchedule(schedule as ScheduleRowLike)
}

export async function deactivateAllowanceScheduleLifecycleSchedule(scheduleId: string) {
  const { familyId } = await requireParentContext()
  const supabase = await createClient()
  await getOwnedScheduleRow(supabase, scheduleId, familyId)

  const { error } = await supabase
    .from('allowance_schedules')
    .update({ is_active: false })
    .eq('id', scheduleId)

  if (error) {
    logger.error('Error deactivating allowance schedule:', error)
    throw new LifecycleError(500, 'Failed to delete allowance schedule')
  }
}
