import { createClient } from '@/lib/supabase/server'
import { getCreditBalance } from '@/lib/data/credits'
import { calculateRemainingTime } from '@/lib/screentime-utils'
import { logger } from '@/lib/logger'
import { pickKey, readBoolean, readDateString, readNullableNumber, readNullableString, readNumber, readObject, readString } from '@/lib/readers'
import type {
  DashboardSnapshot,
  DashboardSnapshotCard,
  DashboardSnapshotCardKind,
  DashboardSnapshotIssue,
  DashboardSnapshotTone,
} from '@/types/dashboard-snapshot'

export interface DashboardViewerContext {
  viewerId: string
  memberId: string | null
  familyId: string
  role: 'PARENT' | 'CHILD' | 'GUEST'
  access: 'full' | 'guest' | 'kiosk'
  guestAccessLevel?: 'VIEW_ONLY' | 'LIMITED' | 'CAREGIVER'
}

interface AssignedChore {
  id: string
  name: string
  description?: string
  status: string
  creditValue: number
  difficulty: string
  dueDate: string
  requiresApproval: boolean
  notes?: string | null
}

interface ScreenTimeAllowancePreview {
  id: string
  screenTimeTypeId: string
  screenTimeTypeName: string
  allowanceMinutes: number
  period: string
  remainingMinutes: number
  usedMinutes: number
  rolloverMinutes: number
}

interface ScreenTimeSummary {
  currentBalance: number
  weeklyAllocation: number
  weekStartDate: string | null
  allowances: ScreenTimeAllowancePreview[]
}

interface CreditSummary {
  current: number
  lifetimeEarned: number
  lifetimeSpent: number
}

interface ShoppingSummary {
  id: string
  name: string
  itemCount: number
  urgentCount: number
  items: Array<{
    id: string
    name: string
    quantity?: number
    unit?: string
    priority: string
  }>
}

interface TodoPreview {
  id: string
  title: string
  priority: string
  dueDate: string | null
  status: string
}

interface CalendarPreview {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string | null
}

interface ProjectTaskPreview {
  id: string
  name: string
  description: string | null
  status: string
  dueDate: string | null
  projectId: string
  projectName: string
}

export function normalizeAssignedChore(
  chore: Record<string, unknown>
): AssignedChore {
  const schedule = readObject(
    pickKey(chore, 'choreSchedule', 'chore_schedule')
  )
  const definition = readObject(
    pickKey(schedule, 'choreDefinition', 'chore_definition')
  )

  return {
    id: readString(chore.id),
    name: readString(definition.name),
    description: readString(definition.description) || undefined,
    status: readString(chore.status),
    creditValue: readNumber(
      pickKey(definition, 'creditValue', 'credit_value')
    ),
    difficulty: readString(definition.difficulty),
    dueDate: readString(pickKey(chore, 'dueDate', 'due_date')),
    requiresApproval: readBoolean(
      pickKey(schedule, 'requiresApproval', 'requires_approval')
    ),
    notes: readNullableString(chore.notes),
  }
}

export function normalizeScreenTimeAllowancePreview(
  allowance: Record<string, unknown>,
  remaining: { remainingMinutes: number; usedMinutes: number; rolloverMinutes: number }
): ScreenTimeAllowancePreview {
  const type = readObject(
    pickKey(allowance, 'screenTimeType', 'screen_time_type')
  )

  return {
    id: readString(allowance.id),
    screenTimeTypeId: readString(
      pickKey(allowance, 'screenTimeTypeId', 'screen_time_type_id')
    ),
    screenTimeTypeName: readString(type.name),
    allowanceMinutes: readNumber(
      pickKey(allowance, 'allowanceMinutes', 'allowance_minutes')
    ),
    period: readString(allowance.period),
    remainingMinutes: remaining.remainingMinutes,
    usedMinutes: remaining.usedMinutes,
    rolloverMinutes: remaining.rolloverMinutes,
  }
}

export function normalizeShoppingListItem(
  item: Record<string, unknown>
): ShoppingSummary['items'][number] {
  return {
    id: readString(item.id),
    name: readString(item.name),
    quantity: readNullableNumber(item.quantity) ?? undefined,
    unit: readNullableString(item.unit) ?? undefined,
    priority: readString(item.priority),
  }
}

export function normalizeShoppingSummary(
  list: Record<string, unknown>
): ShoppingSummary {
  const items = Array.isArray(list.items)
    ? list.items.map((item) => normalizeShoppingListItem(readObject(item)))
    : []

  return {
    id: readString(list.id),
    name: readString(list.name),
    itemCount: items.length,
    urgentCount: items.filter((item) => item.priority === 'URGENT').length,
    items: items.slice(0, 3),
  }
}

export function normalizeTodoPreview(
  todo: Record<string, unknown>
): TodoPreview {
  return {
    id: readString(todo.id),
    title: readString(todo.title),
    priority: readString(todo.priority),
    dueDate: readNullableString(pickKey(todo, 'dueDate', 'due_date')),
    status: readString(todo.status),
  }
}

export function normalizeCalendarEventPreview(
  event: Record<string, unknown>
): CalendarPreview {
  return {
    id: readString(event.id),
    title: readString(event.title),
    startTime: readDateString(pickKey(event, 'startTime', 'start_time')),
    endTime: readDateString(pickKey(event, 'endTime', 'end_time')),
    location: readNullableString(event.location),
  }
}

export function normalizeCalendarEventAssignments(
  event: Record<string, unknown>
): string[] {
  if (!Array.isArray(event.assignments)) {
    return []
  }

  return event.assignments.map((assignment) =>
    readString(pickKey(readObject(assignment), 'memberId', 'member_id'))
  )
}

export function normalizeProjectTaskPreview(
  task: Record<string, unknown>
): ProjectTaskPreview {
  return {
    id: readString(task.id),
    name: readString(task.name),
    description: readNullableString(task.description),
    status: readString(task.status),
    dueDate: readNullableString(pickKey(task, 'dueDate', 'due_date')),
    projectId: readString(pickKey(task, 'projectId', 'project_id')),
    projectName: readString(readObject(task.project).name),
  }
}

const CARD_DEFINITIONS: Record<
  DashboardSnapshotCardKind,
  { title: string; href: string; emptyMessage: string }
> = {
  chores: {
    title: "Today's Chores",
    href: '/dashboard/chores',
    emptyMessage: 'No chores scheduled for today.',
  },
  screentime: {
    title: 'Screen Time',
    href: '/dashboard/screentime',
    emptyMessage: 'Balance not configured yet.',
  },
  credits: {
    title: 'Credits',
    href: '/dashboard/rewards',
    emptyMessage: 'Balance not configured yet.',
  },
  shopping: {
    title: 'Shopping List',
    href: '/dashboard/shopping',
    emptyMessage: 'Shopping list is empty.',
  },
  todos: {
    title: 'To-Do List',
    href: '/dashboard/todos',
    emptyMessage: 'No tasks pending.',
  },
  calendar: {
    title: 'Upcoming Events',
    href: '/dashboard/calendar?view=week',
    emptyMessage: 'No events scheduled.',
  },
  projects: {
    title: 'My Project Tasks',
    href: '/dashboard/projects',
    emptyMessage: 'No project tasks assigned.',
  },
}

function toneFromStatus(status: string): DashboardSnapshotTone {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED':
      return 'good'
    case 'BLOCKED':
    case 'URGENT':
      return 'alert'
    case 'HIGH':
    case 'REJECTED':
      return 'warning'
    default:
      return 'neutral'
  }
}

function buildEmptyCard(kind: DashboardSnapshotCardKind): DashboardSnapshotCard {
  const definition = CARD_DEFINITIONS[kind]
  return {
    kind,
    title: definition.title,
    href: definition.href,
    state: 'empty',
    summary: [],
    preview: [],
    moreCount: 0,
    emptyMessage: definition.emptyMessage,
  }
}

function buildUnavailableCard(kind: DashboardSnapshotCardKind): DashboardSnapshotCard {
  const definition = CARD_DEFINITIONS[kind]
  return {
    kind,
    title: definition.title,
    href: definition.href,
    state: 'unavailable',
    summary: [],
    preview: [],
    moreCount: 0,
    unavailableMessage: 'This card is temporarily unavailable.',
  }
}

function buildRestrictedSnapshot(viewer: DashboardViewerContext, capturedAt: string): DashboardSnapshot {
  return {
    capturedAt,
    partial: false,
    viewer: {
      memberId: viewer.memberId,
      role: viewer.role,
      access: viewer.access,
    },
    cards: (
      ['chores', 'screentime', 'credits', 'shopping', 'todos', 'calendar', 'projects'] as const
    ).map((kind) => buildEmptyCard(kind)),
    issues: [],
  }
}

export async function getAssignedChoresForMember(memberId: string | null): Promise<AssignedChore[]> {
  if (!memberId) {
    return []
  }

  const supabase = await createClient()
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('chore_instances')
    .select(`
      *,
      chore_schedule:chore_schedules(
        *,
        chore_definition:chore_definitions(*)
      )
    `)
    .eq('assigned_to_id', memberId)
    .in('status', ['PENDING', 'REJECTED', 'COMPLETED', 'APPROVED'])
    .lte('due_date', endOfToday.toISOString())
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map((chore) =>
    normalizeAssignedChore(chore as unknown as Record<string, unknown>)
  )
}

async function getScreenTimeSummary(memberId: string | null): Promise<ScreenTimeSummary | null> {
  if (!memberId) {
    return null
  }

  const supabase = await createClient()
  const { data: screenTimeBalance } = await supabase
    .from('screen_time_balances')
    .select(`
      *,
      member:family_members(
        *,
        screen_time_settings:screen_time_settings(*)
      )
    `)
    .eq('member_id', memberId)
    .maybeSingle()

  const { data: allowances } = await supabase
    .from('screen_time_allowances')
    .select(`
      *,
      screen_time_type:screen_time_types!inner(
        id,
        name,
        description
      )
    `)
    .eq('member_id', memberId)
    .eq('screen_time_type.is_active', true)
    .eq('screen_time_type.is_archived', false)

  const allowancesWithRemaining = await Promise.all(
    (allowances || []).map(async (allowance) => {
      const remaining = await calculateRemainingTime(memberId, allowance.screen_time_type_id)
      return normalizeScreenTimeAllowancePreview(
        allowance as unknown as Record<string, unknown>,
        remaining
      )
    })
  )

  if (!screenTimeBalance && allowancesWithRemaining.length === 0) {
    return null
  }

  return {
    currentBalance: allowancesWithRemaining.reduce(
      (sum, allowance) => sum + allowance.remainingMinutes,
      0
    ),
    weeklyAllocation: allowancesWithRemaining
      .filter((allowance) => allowance.period === 'WEEKLY')
      .reduce((sum, allowance) => sum + allowance.allowanceMinutes, 0),
    weekStartDate: screenTimeBalance?.week_start_date ?? null,
    allowances: allowancesWithRemaining,
  }
}

async function getCreditSummary(memberId: string | null): Promise<CreditSummary | null> {
  if (!memberId) {
    return null
  }

  const balance = await getCreditBalance(memberId)

  return {
    current: balance.current_balance,
    lifetimeEarned: balance.lifetime_earned,
    lifetimeSpent: balance.lifetime_spent,
  }
}

async function getShoppingSummary(familyId: string): Promise<ShoppingSummary | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shopping_lists')
    .select(`
      *,
      items:shopping_items!inner(
        *
      )
    `)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .in('items.status', ['PENDING', 'IN_CART'])
    .order('items.priority', { ascending: false })
    .limit(1)

  if (!data?.[0]) {
    return null
  }

  return normalizeShoppingSummary(data[0] as unknown as Record<string, unknown>)
}

async function getTodoSummary(
  familyId: string,
  memberId: string | null
): Promise<TodoPreview[]> {
  if (!memberId) {
    return []
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('todo_items')
    .select('*')
    .eq('family_id', familyId)
    .or(`assigned_to_id.eq.${memberId},assigned_to_id.is.null`)
    .in('status', ['PENDING', 'IN_PROGRESS'])
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true })
    .limit(5)

  if (error) {
    throw error
  }

  return (data || []).map((todo) =>
    normalizeTodoPreview(todo as unknown as Record<string, unknown>)
  )
}

async function getCalendarSummary(
  familyId: string,
  memberId: string | null,
  role: DashboardViewerContext['role']
): Promise<CalendarPreview[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      assignments:calendar_event_assignments!inner(
        member_id
      )
    `)
    .eq('family_id', familyId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5)

  if (error) {
    throw error
  }

  const filtered = (data || []).filter((event) => {
    if (role === 'PARENT') {
      return true
    }

    if (!memberId) {
      return false
    }

    return normalizeCalendarEventAssignments(
      event as unknown as Record<string, unknown>
    ).includes(memberId)
  })

  return filtered.map((event) =>
    normalizeCalendarEventPreview(event as unknown as Record<string, unknown>)
  )
}

async function getProjectTaskSummary(
  familyId: string,
  memberId: string | null
): Promise<ProjectTaskPreview[]> {
  if (!memberId) {
    return []
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      *,
      project:projects!inner(
        id,
        name,
        family_id
      )
    `)
    .eq('assignee_id', memberId)
    .eq('project.family_id', familyId)
    .in('status', ['PENDING', 'IN_PROGRESS', 'BLOCKED'])
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(5)

  if (error) {
    throw error
  }

  return (data || []).map((task) =>
    normalizeProjectTaskPreview(task as unknown as Record<string, unknown>)
  )
}

function buildChoresCard(chores: AssignedChore[]): DashboardSnapshotCard {
  if (chores.length === 0) {
    return buildEmptyCard('chores')
  }

  const completedCount = chores.filter((chore) =>
    ['COMPLETED', 'APPROVED'].includes(chore.status)
  ).length

  return {
    kind: 'chores',
    title: CARD_DEFINITIONS.chores.title,
    href: CARD_DEFINITIONS.chores.href,
    state: 'ready',
    badge: {
      label: `${completedCount}/${chores.length}`,
      tone: completedCount === chores.length ? 'good' : 'neutral',
    },
    summary: [{ label: 'Pending', value: `${chores.filter((chore) => chore.status === 'PENDING').length}` }],
    preview: chores.slice(0, 3).map((chore) => ({
      id: chore.id,
      primary: chore.name,
      secondary: `+${chore.creditValue} credits`,
      meta: chore.status.toLowerCase(),
      tone: toneFromStatus(chore.status),
    })),
    moreCount: Math.max(0, chores.length - 3),
  }
}

function buildScreenTimeCard(screenTime: ScreenTimeSummary | null): DashboardSnapshotCard {
  if (!screenTime) {
    return buildEmptyCard('screentime')
  }

  return {
    kind: 'screentime',
    title: CARD_DEFINITIONS.screentime.title,
    href: CARD_DEFINITIONS.screentime.href,
    state: 'ready',
    badge: {
      label: `${screenTime.currentBalance} min`,
      tone: screenTime.currentBalance > 0 ? 'good' : 'warning',
    },
    summary: [{ label: 'Weekly Allocation', value: `${screenTime.weeklyAllocation} min` }],
    preview: screenTime.allowances.slice(0, 3).map((allowance) => ({
      id: allowance.id,
      primary: allowance.screenTimeTypeName,
      secondary: `${allowance.remainingMinutes}m remaining`,
      meta: `${Math.round(
        allowance.allowanceMinutes > 0
          ? (allowance.remainingMinutes / allowance.allowanceMinutes) * 100
          : 0
      )}%`,
      tone:
        allowance.remainingMinutes < allowance.allowanceMinutes * 0.2
          ? 'alert'
          : 'good',
      progress:
        allowance.allowanceMinutes > 0
          ? Math.min(
              100,
              Math.round((allowance.remainingMinutes / allowance.allowanceMinutes) * 100)
            )
          : 0,
    })),
    moreCount: Math.max(0, screenTime.allowances.length - 3),
  }
}

function buildCreditsCard(credits: CreditSummary | null): DashboardSnapshotCard {
  if (!credits) {
    return buildEmptyCard('credits')
  }

  return {
    kind: 'credits',
    title: CARD_DEFINITIONS.credits.title,
    href: CARD_DEFINITIONS.credits.href,
    state: 'ready',
    badge: {
      label: `${credits.current}`,
      tone: 'neutral',
    },
    summary: [
      { label: 'Current Balance', value: `${credits.current} credits` },
      { label: 'Lifetime Earned', value: `${credits.lifetimeEarned}` },
      { label: 'Lifetime Spent', value: `${credits.lifetimeSpent}` },
    ],
    preview: [],
    moreCount: 0,
  }
}

function buildShoppingCard(shopping: ShoppingSummary | null): DashboardSnapshotCard {
  if (!shopping || shopping.itemCount === 0) {
    return buildEmptyCard('shopping')
  }

  return {
    kind: 'shopping',
    title: CARD_DEFINITIONS.shopping.title,
    href: CARD_DEFINITIONS.shopping.href,
    state: 'ready',
    badge: {
      label: `${shopping.itemCount}`,
      tone: shopping.urgentCount > 0 ? 'warning' : 'neutral',
    },
    summary: [{ label: 'Urgent Items', value: `${shopping.urgentCount}` }],
    preview: shopping.items.map((item) => ({
      id: item.id,
      primary: item.name,
      secondary:
        item.quantity && item.unit
          ? `${item.quantity} ${item.unit}`
          : item.quantity
          ? `${item.quantity}`
          : item.unit || undefined,
      meta: item.priority === 'URGENT' ? 'Urgent' : undefined,
      tone: item.priority === 'URGENT' ? 'alert' : 'neutral',
    })),
    moreCount: Math.max(0, shopping.itemCount - shopping.items.length),
  }
}

function buildTodosCard(todos: TodoPreview[]): DashboardSnapshotCard {
  if (todos.length === 0) {
    return buildEmptyCard('todos')
  }

  return {
    kind: 'todos',
    title: CARD_DEFINITIONS.todos.title,
    href: CARD_DEFINITIONS.todos.href,
    state: 'ready',
    badge: {
      label: `${todos.length}`,
      tone: 'neutral',
    },
    summary: [],
    preview: todos.slice(0, 3).map((todo) => ({
      id: todo.id,
      primary: todo.title,
      secondary: todo.dueDate
        ? `Due: ${new Date(todo.dueDate).toLocaleDateString()}`
        : undefined,
      meta: todo.priority,
      tone: toneFromStatus(todo.priority),
    })),
    moreCount: Math.max(0, todos.length - 3),
  }
}

function buildCalendarCard(events: CalendarPreview[]): DashboardSnapshotCard {
  if (events.length === 0) {
    return buildEmptyCard('calendar')
  }

  return {
    kind: 'calendar',
    title: CARD_DEFINITIONS.calendar.title,
    href: CARD_DEFINITIONS.calendar.href,
    state: 'ready',
    badge: {
      label: `${events.length}`,
      tone: 'neutral',
    },
    summary: [],
    preview: events.slice(0, 3).map((event) => ({
      id: event.id,
      primary: event.title,
      secondary: `${new Date(event.startTime).toLocaleDateString()} at ${new Date(
        event.startTime
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      meta: event.location || undefined,
    })),
    moreCount: Math.max(0, events.length - 3),
  }
}

function buildProjectsCard(tasks: ProjectTaskPreview[]): DashboardSnapshotCard {
  if (tasks.length === 0) {
    return buildEmptyCard('projects')
  }

  return {
    kind: 'projects',
    title: CARD_DEFINITIONS.projects.title,
    href: CARD_DEFINITIONS.projects.href,
    state: 'ready',
    badge: {
      label: `${tasks.length}`,
      tone: 'neutral',
    },
    summary: [],
    preview: tasks.slice(0, 3).map((task) => ({
      id: task.id,
      primary: task.name,
      secondary: task.projectName,
      meta: task.status.replace('_', ' '),
      tone: toneFromStatus(task.status),
      href: `/dashboard/projects/${task.projectId}/tasks/${task.id}`,
    })),
    moreCount: Math.max(0, tasks.length - 3),
  }
}

async function safeCard(
  kind: DashboardSnapshotCardKind,
  issues: DashboardSnapshotIssue[],
  factory: () => Promise<DashboardSnapshotCard>
) {
  try {
    return await factory()
  } catch (error) {
    logger.error(`Dashboard Snapshot ${kind} card error`, error)
    issues.push({
      kind,
      code: 'source-unavailable',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
    return buildUnavailableCard(kind)
  }
}

export async function buildDashboardSnapshot(
  viewer: DashboardViewerContext
): Promise<DashboardSnapshot> {
  const capturedAt = new Date().toISOString()

  if (!viewer.familyId) {
    throw new Error('Dashboard Snapshot requires a familyId')
  }

  if (viewer.access === 'guest' || (viewer.access === 'kiosk' && !viewer.memberId)) {
    return buildRestrictedSnapshot(viewer, capturedAt)
  }

  const issues: DashboardSnapshotIssue[] = []

  const [
    choresCard,
    screenTimeCard,
    creditsCard,
    shoppingCard,
    todosCard,
    calendarCard,
    projectsCard,
  ] = await Promise.all([
    safeCard('chores', issues, async () =>
      buildChoresCard(await getAssignedChoresForMember(viewer.memberId))
    ),
    safeCard('screentime', issues, async () =>
      buildScreenTimeCard(await getScreenTimeSummary(viewer.memberId))
    ),
    safeCard('credits', issues, async () =>
      buildCreditsCard(await getCreditSummary(viewer.memberId))
    ),
    safeCard('shopping', issues, async () =>
      buildShoppingCard(await getShoppingSummary(viewer.familyId))
    ),
    safeCard('todos', issues, async () =>
      buildTodosCard(await getTodoSummary(viewer.familyId, viewer.memberId))
    ),
    safeCard('calendar', issues, async () =>
      buildCalendarCard(await getCalendarSummary(viewer.familyId, viewer.memberId, viewer.role))
    ),
    safeCard('projects', issues, async () =>
      buildProjectsCard(await getProjectTaskSummary(viewer.familyId, viewer.memberId))
    ),
  ])

  return {
    capturedAt,
    partial: issues.length > 0,
    viewer: {
      memberId: viewer.memberId,
      role: viewer.role,
      access: viewer.access,
    },
    cards: [
      choresCard,
      screenTimeCard,
      creditsCard,
      shoppingCard,
      todosCard,
      calendarCard,
      projectsCard,
    ],
    issues,
  }
}
