import { describe, it, expect } from '@jest/globals'
import {
  normalizeAssignedChore,
  normalizeScreenTimeAllowancePreview,
  normalizeShoppingListItem,
  normalizeShoppingSummary,
  normalizeTodoPreview,
  normalizeCalendarEventPreview,
  normalizeCalendarEventAssignments,
  normalizeProjectTaskPreview,
} from '@/lib/data/dashboard-snapshot'

describe('normalizeAssignedChore', () => {
  it('maps a chore_instances row with nested schedule/definition', () => {
    const result = normalizeAssignedChore({
      id: 'chore-1',
      status: 'PENDING',
      due_date: '2026-01-01T00:00:00.000Z',
      notes: 'take out bins',
      chore_schedule: {
        requires_approval: true,
        chore_definition: {
          name: 'Take out trash',
          description: 'To the curb',
          credit_value: 5,
          difficulty: 'EASY',
        },
      },
    })

    expect(result).toEqual({
      id: 'chore-1',
      name: 'Take out trash',
      description: 'To the curb',
      status: 'PENDING',
      creditValue: 5,
      difficulty: 'EASY',
      dueDate: '2026-01-01T00:00:00.000Z',
      requiresApproval: true,
      notes: 'take out bins',
    })
  })

  it('handles missing description and null notes', () => {
    const result = normalizeAssignedChore({
      id: 'chore-2',
      status: 'COMPLETED',
      due_date: '2026-01-01T00:00:00.000Z',
      notes: null,
      chore_schedule: {
        requires_approval: false,
        chore_definition: {
          name: 'Water plants',
          description: null,
          credit_value: 3,
          difficulty: 'MEDIUM',
        },
      },
    })

    expect(result).toEqual({
      id: 'chore-2',
      name: 'Water plants',
      description: undefined,
      status: 'COMPLETED',
      creditValue: 3,
      difficulty: 'MEDIUM',
      dueDate: '2026-01-01T00:00:00.000Z',
      requiresApproval: false,
      notes: null,
    })
  })
})

describe('normalizeScreenTimeAllowancePreview', () => {
  it('maps an allowance row using the precomputed remaining time', () => {
    const result = normalizeScreenTimeAllowancePreview(
      {
        id: 'allow-1',
        screen_time_type_id: 'type-1',
        allowance_minutes: 120,
        period: 'WEEKLY',
        screen_time_type: { name: 'Games' },
      },
      { remainingMinutes: 45, usedMinutes: 75, rolloverMinutes: 0 }
    )

    expect(result).toEqual({
      id: 'allow-1',
      screenTimeTypeId: 'type-1',
      screenTimeTypeName: 'Games',
      allowanceMinutes: 120,
      period: 'WEEKLY',
      remainingMinutes: 45,
      usedMinutes: 75,
      rolloverMinutes: 0,
    })
  })
})

describe('normalizeShoppingListItem', () => {
  it('maps a shopping_items row, dropping null quantity/unit', () => {
    const result = normalizeShoppingListItem({
      id: 'item-1',
      name: 'Apples',
      quantity: 3,
      unit: 'lb',
      priority: 'URGENT',
    })

    expect(result).toEqual({
      id: 'item-1',
      name: 'Apples',
      quantity: 3,
      unit: 'lb',
      priority: 'URGENT',
    })
  })

  it('omits null quantity and unit', () => {
    const result = normalizeShoppingListItem({
      id: 'item-2',
      name: 'Milk',
      quantity: null,
      unit: null,
      priority: 'NORMAL',
    })

    expect(result).toEqual({
      id: 'item-2',
      name: 'Milk',
      quantity: undefined,
      unit: undefined,
      priority: 'NORMAL',
    })
  })
})

describe('normalizeShoppingSummary', () => {
  it('maps a shopping_lists row with nested items', () => {
    const result = normalizeShoppingSummary({
      id: 'list-1',
      name: 'Groceries',
      items: [
        { id: 'i1', name: 'Apples', quantity: 3, unit: 'lb', priority: 'URGENT' },
        { id: 'i2', name: 'Bread', quantity: 1, unit: 'loaf', priority: 'NORMAL' },
        { id: 'i3', name: 'Milk', priority: 'NORMAL' },
        { id: 'i4', name: 'Eggs', priority: 'NORMAL' },
      ],
    })

    expect(result).toEqual({
      id: 'list-1',
      name: 'Groceries',
      itemCount: 4,
      urgentCount: 1,
      items: [
        { id: 'i1', name: 'Apples', quantity: 3, unit: 'lb', priority: 'URGENT' },
        { id: 'i2', name: 'Bread', quantity: 1, unit: 'loaf', priority: 'NORMAL' },
        { id: 'i3', name: 'Milk', priority: 'NORMAL' },
      ],
    })
  })

  it('returns empty items when the row has none', () => {
    const result = normalizeShoppingSummary({ id: 'list-2', name: 'Empty' })

    expect(result).toEqual({
      id: 'list-2',
      name: 'Empty',
      itemCount: 0,
      urgentCount: 0,
      items: [],
    })
  })
})

describe('normalizeTodoPreview', () => {
  it('maps a todo_items row', () => {
    const result = normalizeTodoPreview({
      id: 'todo-1',
      title: 'Finish homework',
      priority: 'HIGH',
      due_date: '2026-01-01T00:00:00.000Z',
      status: 'PENDING',
    })

    expect(result).toEqual({
      id: 'todo-1',
      title: 'Finish homework',
      priority: 'HIGH',
      dueDate: '2026-01-01T00:00:00.000Z',
      status: 'PENDING',
    })
  })
})

describe('normalizeCalendarEventPreview', () => {
  it('maps a calendar_events row', () => {
    const result = normalizeCalendarEventPreview({
      id: 'event-1',
      title: 'Soccer practice',
      start_time: '2026-01-01T16:00:00.000Z',
      end_time: '2026-01-01T17:00:00.000Z',
      location: 'Field 2',
    })

    expect(result).toEqual({
      id: 'event-1',
      title: 'Soccer practice',
      startTime: '2026-01-01T16:00:00.000Z',
      endTime: '2026-01-01T17:00:00.000Z',
      location: 'Field 2',
    })
  })

  it('handles null location', () => {
    const result = normalizeCalendarEventPreview({
      id: 'event-2',
      title: 'Music lesson',
      start_time: '2026-01-01T16:00:00.000Z',
      end_time: '2026-01-01T17:00:00.000Z',
      location: null,
    })

    expect(result).toEqual({
      id: 'event-2',
      title: 'Music lesson',
      startTime: '2026-01-01T16:00:00.000Z',
      endTime: '2026-01-01T17:00:00.000Z',
      location: null,
    })
  })
})

describe('normalizeCalendarEventAssignments', () => {
  it('extracts member ids from nested assignments', () => {
    const result = normalizeCalendarEventAssignments({
      assignments: [{ member_id: 'member-1' }, { member_id: 'member-2' }],
    })

    expect(result).toEqual(['member-1', 'member-2'])
  })

  it('returns empty array when assignments are missing', () => {
    expect(normalizeCalendarEventAssignments({})).toEqual([])
  })
})

describe('normalizeProjectTaskPreview', () => {
  it('maps a project_tasks row with nested project', () => {
    const result = normalizeProjectTaskPreview({
      id: 'task-1',
      name: 'Design logo',
      description: 'Draft two options',
      status: 'PENDING',
      due_date: '2026-01-01T00:00:00.000Z',
      project_id: 'project-1',
      project: { name: 'Website' },
    })

    expect(result).toEqual({
      id: 'task-1',
      name: 'Design logo',
      description: 'Draft two options',
      status: 'PENDING',
      dueDate: '2026-01-01T00:00:00.000Z',
      projectId: 'project-1',
      projectName: 'Website',
    })
  })

  it('handles null description and due date', () => {
    const result = normalizeProjectTaskPreview({
      id: 'task-2',
      name: 'Fix bug',
      description: null,
      status: 'IN_PROGRESS',
      due_date: null,
      project_id: 'project-1',
      project: { name: 'Website' },
    })

    expect(result).toEqual({
      id: 'task-2',
      name: 'Fix bug',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: null,
      projectId: 'project-1',
      projectName: 'Website',
    })
  })
})
