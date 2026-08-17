import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createMockSupabaseClient, resetSupabaseMocks, type MockSupabaseClient } from '@/lib/test-utils/supabase-mock'
import { insertFamilyNotification } from '@/lib/data/notifications'

function captureInsertPayload(
  client: MockSupabaseClient
): Record<string, unknown> {
  const builder = client.from('notifications') as unknown as { insert: jest.Mock }
  return builder.insert.mock.calls[0][0] as Record<string, unknown>
}

describe('insertFamilyNotification', () => {
  let client: MockSupabaseClient

  beforeEach(() => {
    client = createMockSupabaseClient()
    resetSupabaseMocks(client)
  })

  it('inserts a notification row with snake_case columns', async () => {
    await insertFamilyNotification(
      {
        userId: 'member-1',
        type: 'REWARD_APPROVED',
        title: 'Reward approved!',
        message: 'Your reward "Ice cream" has been approved!',
        actionUrl: '/dashboard/rewards/redemptions',
        metadata: { redemptionId: 'redemption-1', rewardName: 'Ice cream' },
      },
      client as never
    )

    expect(client.from).toHaveBeenCalledWith('notifications')
    expect(captureInsertPayload(client)).toEqual({
      user_id: 'member-1',
      type: 'REWARD_APPROVED',
      title: 'Reward approved!',
      message: 'Your reward "Ice cream" has been approved!',
      action_url: '/dashboard/rewards/redemptions',
      metadata: { redemptionId: 'redemption-1', rewardName: 'Ice cream' },
    })
  })

  it('omits optional action_url and metadata when not provided', async () => {
    await insertFamilyNotification(
      {
        userId: 'member-2',
        type: 'REWARD_REJECTED',
        title: 'Reward declined',
        message: 'Your reward was not approved.',
      },
      client as never
    )

    expect(captureInsertPayload(client)).toEqual({
      user_id: 'member-2',
      type: 'REWARD_REJECTED',
      title: 'Reward declined',
      message: 'Your reward was not approved.',
      action_url: null,
      metadata: null,
    })
  })

  it('throws when the insert fails', async () => {
    const builder = client.from('notifications') as unknown as {
      insert: jest.Mock
    }
    builder.insert.mockResolvedValue({
      data: null,
      error: { message: 'insert failed', code: 'PGRST301' },
    } as never)

    await expect(
      insertFamilyNotification(
        { userId: 'member-3', type: 'GENERAL', title: 'Hi', message: 'Hello' },
        client as never
      )
    ).rejects.toMatchObject({ message: 'insert failed' })
  })
})
