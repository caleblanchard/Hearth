import { createClient } from '@/lib/supabase/server'
import {
  writeAuditLog,
  LifecycleError,
  requireParentContext,
  requireViewerContext,
} from '@/lib/data/lifecycle-core'
import {
  completeRoutine,
  createRoutine,
  getRoutine,
  getTodayCompletions,
  updateRoutine,
  wasRoutineCompletedToday,
} from '@/lib/data/routines'
import type { Database } from '@/lib/database.types'
import type { RoutineLifecycleStepRecord } from '@/types/routine-lifecycle'

type RoutineRow = Database['public']['Tables']['routines']['Row']
type RoutineRowWithSteps = RoutineRow & { steps: RoutineLifecycleStepRecord[] }
type RoutineUpdateRow = Database['public']['Tables']['routines']['Update']

async function readRoutineForFamily(routineId: string, familyId: string) {
  const routine = await getRoutine(routineId)
  if (!routine) {
    throw new LifecycleError(404, 'Routine not found')
  }

  const routineFamilyId =
    (routine as { family_id?: string | null }).family_id ??
    (routine as { familyId?: string | null }).familyId
  if (routineFamilyId !== familyId) {
    throw new LifecycleError(403, 'You do not have permission to view this routine')
  }

  return routine
}

export async function getRoutineLifecycleRoutines(query: {
  type?: string | null
  assignedTo?: string | null
}) {
  const { familyId, memberId, role } = await requireViewerContext()
  const { type, assignedTo } = query
  const supabase = await createClient()

  let routinesQuery = supabase
    .from('routines')
    .select(`*, steps:routine_steps(*)`)
    .eq('family_id', familyId)
    .order('name')

  if (type) routinesQuery = routinesQuery.eq('type', type as Database['public']['Enums']['routine_type'])
  if (assignedTo) routinesQuery = routinesQuery.eq('assigned_to', assignedTo)
  if (role === 'CHILD') {
    routinesQuery = routinesQuery.or(`assigned_to.eq.${memberId},assigned_to.is.null`)
  }

  const [rawRoutinesResult, todayCompletions] = await Promise.all([
    routinesQuery,
    getTodayCompletions(memberId),
  ])

  if (rawRoutinesResult.error) {
    throw rawRoutinesResult.error
  }

  const completedRoutineIds = new Map(
    (todayCompletions || []).map((completion: any) => [completion.routine_id, completion.completed_at])
  )

  return (rawRoutinesResult.data || []).map((routine: any) => ({
    id: routine.id,
    name: routine.name,
    type: routine.type,
    assignedTo: routine.assigned_to,
    isWeekday: routine.is_weekday,
    isWeekend: routine.is_weekend,
    steps: (routine.steps || [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((step: any) => ({
        id: step.id,
        name: step.name,
        icon: step.icon,
        estimatedMinutes: step.estimated_minutes,
        sortOrder: step.sort_order,
      })),
    completedToday: completedRoutineIds.has(routine.id),
    completedAt: completedRoutineIds.get(routine.id) || null,
  }))
}

export async function createRoutineLifecycleRoutine(body: Record<string, unknown>) {
  const { familyId, memberId } = await requireParentContext('Unauthorized - Only parents can create routines')

  const supabase = await createClient()
  const name = typeof body.name === 'string' ? body.name : ''
  const type = typeof body.type === 'string' ? body.type : typeof body.timeOfDay === 'string' ? body.timeOfDay : 'CUSTOM'
  const assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo : null
  const steps = Array.isArray(body.steps) ? body.steps : []

  if (!name.trim()) {
    throw new LifecycleError(400, 'Name is required')
  }
  if (!type || type === 'INVALID_TYPE') {
    throw new LifecycleError(400, 'Valid type is required')
  }

  if (assignedTo) {
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', assignedTo)
      .eq('family_id', familyId)
      .single()

    if (!member) {
      throw new LifecycleError(400, 'Assigned family member not found')
    }
  }

  const routine = await createRoutine({
    family_id: familyId,
    name: name.trim(),
    type: type as 'MORNING' | 'BEDTIME' | 'HOMEWORK' | 'AFTER_SCHOOL' | 'CUSTOM',
    assigned_to: assignedTo,
    is_weekday: typeof body.isWeekday === 'boolean' ? body.isWeekday : true,
    is_weekend: typeof body.isWeekend === 'boolean' ? body.isWeekend : true,
  })

  if (steps.length > 0) {
    const itemsPayload = steps.map((step: any, index: number) => ({
      routine_id: routine.id,
      name: step.name,
      icon: step.icon,
      estimated_minutes: step.estimatedMinutes,
      sort_order: typeof step.sortOrder === 'number' ? step.sortOrder : index,
    }))

    const { data: insertedSteps } = await supabase.from('routine_steps').insert(itemsPayload).select()
    ;(routine as RoutineRowWithSteps).steps = (insertedSteps && insertedSteps.length > 0 ? insertedSteps : itemsPayload).map((step: any) => ({
      id: step.id,
      name: step.name,
      icon: step.icon,
      sortOrder: step.sort_order,
      estimatedMinutes: step.estimated_minutes,
    }))
  }

  await writeAuditLog({
    familyId,
    memberId,
    action: 'ROUTINE_CREATED',
    entityType: 'ROUTINE',
    entityId: routine.id,
    metadata: {
      name: routine.name,
      type: routine.type,
    },
  })

  return routine
}

export async function getRoutineLifecycleRoutine(routineId: string) {
  const { familyId } = await requireViewerContext()
  return readRoutineForFamily(routineId, familyId)
}

export async function updateRoutineLifecycleRoutine(routineId: string, body: Record<string, unknown>) {
  const { familyId, memberId, role } = await requireViewerContext()
  const existing = await readRoutineForFamily(routineId, familyId)
  if (role !== 'PARENT') {
    throw new LifecycleError(403, 'Forbidden')
  }

  const supabase = await createClient()
  const { steps, ...updates } = body
  const routine = await updateRoutine(routineId, updates)

  if (Array.isArray(steps)) {
    await supabase.from('routine_steps').delete().eq('routine_id', routineId)
    const itemsPayload = steps.map((step: any, index: number) => ({
      routine_id: routineId,
      name: step.name,
      icon: step.icon,
      estimated_minutes: step.estimatedMinutes,
      sort_order: typeof step.sortOrder === 'number' ? step.sortOrder : index,
    }))

    if (itemsPayload.length > 0) {
      await supabase.from('routine_steps').insert(itemsPayload)
    }

    ;(routine as RoutineRowWithSteps).steps = itemsPayload.map((step: any) => ({
      ...step,
      sortOrder: step.sort_order,
      estimatedMinutes: step.estimated_minutes,
    }))
  }

  await writeAuditLog({
    familyId,
    memberId,
    action: 'ROUTINE_UPDATED',
    entityType: 'ROUTINE',
    entityId: routine.id,
    metadata: {
      name: routine.name,
      type: routine.type,
    },
  })

  return routine
}

export async function deleteRoutineLifecycleRoutine(routineId: string) {
  const { familyId, memberId, role } = await requireViewerContext()
  const existing = await readRoutineForFamily(routineId, familyId)
  if (role !== 'PARENT') {
    throw new LifecycleError(403, 'Forbidden')
  }

  await updateRoutine(routineId, { isActive: false } as RoutineUpdateRow)
  await writeAuditLog({
    familyId,
    memberId,
    action: 'ROUTINE_DELETED',
    entityType: 'ROUTINE',
    entityId: routineId,
    metadata: {
      name: existing.name,
      type: existing.type,
    },
  })
}

export async function completeRoutineLifecycleRoutine(
  routineId: string,
  body: { completedItems?: string[]; memberId?: string } = {}
) {
  const { familyId, memberId, role } = await requireViewerContext()
  const supabase = await createClient()
  const { data: routine } = await supabase
    .from('routines')
    .select('family_id, assigned_to, name')
    .eq('id', routineId)
    .single()

  if (!routine) {
    throw new LifecycleError(404, 'Routine not found')
  }
  if (routine.family_id !== familyId) {
    throw new LifecycleError(403, 'You do not have permission to complete this routine')
  }

  const completerId = body.memberId || memberId
  if (completerId !== memberId) {
    if (role !== 'PARENT') {
      throw new LifecycleError(403, 'Only parents can complete routines for others')
    }
    const { data: targetMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', completerId)
      .eq('family_id', familyId)
      .single()

    if (!targetMember) {
      throw new LifecycleError(400, 'Target family member not found')
    }
  }

  if (routine.assigned_to && routine.assigned_to !== completerId && role !== 'PARENT') {
    throw new LifecycleError(403, 'This routine is not assigned to you')
  }

  const isDuplicate = await wasRoutineCompletedToday(routineId, completerId)
  if (isDuplicate) {
    throw new LifecycleError(400, 'Routine already completed today')
  }

  let completion: Awaited<ReturnType<typeof completeRoutine>>
  try {
    completion = await completeRoutine(routineId, completerId, body.completedItems || [])
  } catch (error) {
    const candidate = error as { code?: string; message?: string }
    if (candidate.code === 'P2002' || candidate.message?.includes('Unique constraint failed')) {
      throw new LifecycleError(400, 'Routine already completed today')
    }
    throw error
  }
  await writeAuditLog({
    familyId,
    memberId,
    action: 'ROUTINE_COMPLETED',
    entityType: 'ROUTINE',
    entityId: routineId,
    metadata: {
      routineName: routine.name,
      completedBy: completerId,
      completedItemsCount: body.completedItems?.length || 0,
    },
  })

  return completion
}

export async function getRoutineLifecycleCompletions(query: {
  memberId?: string | null
  routineId?: string | null
  startDate?: string | null
  endDate?: string | null
  limit?: string | null
  offset?: string | null
}) {
  const { familyId, memberId, memberships } = await requireViewerContext()
  const membership = memberships.find((candidate) => candidate.familyId === familyId || candidate.id === memberId)
  if (!membership) {
    throw new LifecycleError(403, 'Unauthorized access to family')
  }

  const isChild = membership.role === 'CHILD'
  const currentMemberId = memberId
  let targetMemberId = query.memberId || undefined
  if (isChild) {
    targetMemberId = currentMemberId
  }

  const routineId = query.routineId || undefined
  const startDateStr = query.startDate
  const endDateStr = query.endDate
  const limit = Math.min(Math.max(1, parseInt(query.limit || '50', 10)), 100)
  const offset = Math.max(0, parseInt(query.offset || '0', 10))
  const supabase = await createClient()

  let completionsQuery = supabase
    .from('routine_completions')
    .select(
      `
        *,
        routine:routines!inner(family_id),
        member:family_members!member_id(id, name)
      `,
      { count: 'exact' }
    )
    .eq('routine.family_id', familyId)
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (targetMemberId) completionsQuery = completionsQuery.eq('member_id', targetMemberId)
  if (routineId) completionsQuery = completionsQuery.eq('routine_id', routineId)
  if (startDateStr) completionsQuery = completionsQuery.gte('date', new Date(startDateStr))
  if (endDateStr) completionsQuery = completionsQuery.lte('date', new Date(endDateStr))

  const { data: completions, count, error } = await completionsQuery
  if (error) throw error

  return {
    completions,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  }
}
