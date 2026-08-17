import { describe, it, expect } from '@jest/globals'
import {
  normalizePendingChoreCompletion,
  normalizePendingRewardRedemption,
} from '@/lib/data/approval-request-lifecycle'

describe('normalizePendingRewardRedemption', () => {
  it('maps a redemption row with nested reward and member into a PendingRewardRedemptionRecord', () => {
    const result = normalizePendingRewardRedemption({
      id: 'redemption-1',
      status: 'PENDING',
      requested_at: '2026-01-02T10:00:00.000Z',
      notes: 'Wants a treat',
      reward: {
        id: 'reward-1',
        name: 'Ice cream',
        description: 'A scoop of vanilla',
        cost_credits: 50,
        category: 'Treat',
      },
      member: {
        id: 'member-1',
        name: 'Alex',
        avatar_url: 'https://example.com/alex.png',
      },
    })

    expect(result).toEqual({
      id: 'redemption-1',
      status: 'PENDING',
      requestedAt: '2026-01-02T10:00:00.000Z',
      notes: 'Wants a treat',
      reward: {
        id: 'reward-1',
        name: 'Ice cream',
        description: 'A scoop of vanilla',
        costCredits: 50,
        category: 'Treat',
      },
      member: {
        id: 'member-1',
        name: 'Alex',
        avatarUrl: 'https://example.com/alex.png',
      },
    })
  })

  it('accepts camelCase aliases and omits missing optional fields', () => {
    const result = normalizePendingRewardRedemption({
      id: 'redemption-2',
      status: 'PENDING',
      requestedAt: '2026-02-03T09:30:00.000Z',
      reward: {
        id: 'reward-2',
        name: 'Movie night',
        costCredits: 100,
        category: 'Activity',
      },
      member: { id: 'member-2', name: 'Sam' },
    })

    expect(result).toEqual({
      id: 'redemption-2',
      status: 'PENDING',
      requestedAt: '2026-02-03T09:30:00.000Z',
      notes: undefined,
      reward: {
        id: 'reward-2',
        name: 'Movie night',
        description: undefined,
        costCredits: 100,
        category: 'Activity',
      },
      member: {
        id: 'member-2',
        name: 'Sam',
        avatarUrl: undefined,
      },
    })
  })
})

describe('normalizePendingChoreCompletion', () => {
  it('maps a chore_instances row with nested aliases into a PendingChoreCompletionRecord', () => {
    const result = normalizePendingChoreCompletion({
      id: 'instance-1',
      status: 'COMPLETED',
      assigned_to_id: 'member-1',
      chore_schedule_id: 'schedule-1',
      completed_at: '2026-01-02T10:00:00.000Z',
      completed_by_id: 'member-1',
      approved_by_id: null,
      credits_awarded: 10,
      due_date: '2026-01-02',
      notes: 'Done early',
      photo_url: null,
      assignedTo: { id: 'member-1', name: 'Alex', avatar_url: null },
      choreSchedule: {
        choreDefinition: {
          name: 'Take out trash',
          credit_value: 10,
          family_id: 'family-1',
        },
      },
    })

    expect(result).toEqual({
      id: 'instance-1',
      status: 'COMPLETED',
      assigned_to_id: 'member-1',
      chore_schedule_id: 'schedule-1',
      completed_at: '2026-01-02T10:00:00.000Z',
      completed_by_id: 'member-1',
      approved_by_id: null,
      credits_awarded: 10,
      due_date: '2026-01-02',
      notes: 'Done early',
      photo_url: null,
      assignedTo: { id: 'member-1', name: 'Alex', avatar_url: null },
      choreSchedule: {
        choreDefinition: {
          name: 'Take out trash',
          credit_value: 10,
          family_id: 'family-1',
        },
      },
    })
  })

  it('maps a row with missing nested objects to nulls', () => {
    const result = normalizePendingChoreCompletion({
      id: 'instance-2',
      status: 'COMPLETED',
      assigned_to_id: 'member-2',
      chore_schedule_id: 'schedule-2',
      completed_at: '2026-03-04T08:00:00.000Z',
      completed_by_id: null,
      approved_by_id: null,
      credits_awarded: null,
      due_date: '2026-03-04',
      notes: null,
      photo_url: null,
    })

    expect(result).toEqual({
      id: 'instance-2',
      status: 'COMPLETED',
      assigned_to_id: 'member-2',
      chore_schedule_id: 'schedule-2',
      completed_at: '2026-03-04T08:00:00.000Z',
      completed_by_id: null,
      approved_by_id: null,
      credits_awarded: null,
      due_date: '2026-03-04',
      notes: null,
      photo_url: null,
      assignedTo: null,
      choreSchedule: null,
    })
  })
})
