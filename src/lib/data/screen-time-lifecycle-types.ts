import { createClient } from '@/lib/supabase/server'
import {
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import { sanitizeString } from '@/lib/input-sanitization'
import type {
  CreateScreenTimeLifecycleTypeInput,
  ScreenTimeLifecycleTypeRecord,
  UpdateScreenTimeLifecycleTypeInput,
} from '@/types/screen-time-lifecycle'
import {
  loadOwnedType,
  normalizeScreenTimeType,
  normalizeTypeName,
  type ScreenTimeTypeInsert,
  type ScreenTimeTypeUpdate,
  type TypeRowLike,
} from './screen-time-lifecycle-shared'

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
