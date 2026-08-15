import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'
import {
  mockChildSession,
  mockParentSession,
} from '@/lib/test-utils/auth-mock'
import {
  approveRewardRedemptionRequest,
  listApprovalRequests,
  processApprovalRequests,
} from '@/lib/data/approval-request-lifecycle'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/data/chores', () => ({
  approveChore: jest.fn(),
  rejectChore: jest.fn(),
}))

const { approveChore } = jest.requireMock('@/lib/data/chores')

describe('approval-request-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
    mockParentSession()
  })

  it('rejects non-parent callers before listing approval requests', async () => {
    mockChildSession()

    await expect(listApprovalRequests({})).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden - Parent access required',
    })
  })

  it('lists normalized approval requests and keeps shopping requests read-only', async () => {
    dbMock.choreInstance.findMany.mockResolvedValue([
      {
        id: 'chore-1',
        status: 'COMPLETED',
        completedAt: '2026-05-19T12:00:00.000Z',
        assignedTo: {
          id: 'child-1',
          name: 'Alice Example',
          avatarUrl: null,
        },
        choreSchedule: {
          choreDefinition: {
            name: 'Clean room',
            creditValue: 10,
            familyId: 'family-test-123',
          },
        },
        notes: 'Done well',
        photoUrl: '/proof.png',
      },
    ] as never)
    dbMock.rewardRedemption.findMany.mockResolvedValue([
      {
        id: 'reward-1',
        status: 'PENDING',
        requestedAt: '2026-05-18T12:00:00.000Z',
        member: {
          id: 'child-2',
          name: 'Bob Example',
          avatarUrl: '/avatar.png',
        },
        reward: {
          name: 'Movie night',
          costCredits: 25,
          familyId: 'family-test-123',
        },
      },
    ] as never)
    dbMock.shoppingItem.findMany.mockResolvedValue([
      {
        id: 'shopping-1',
        name: 'Milk',
        createdAt: '2026-05-17T12:00:00.000Z',
        requestedBy: {
          id: 'child-3',
          name: 'Casey Example',
          avatarUrl: null,
        },
      },
    ] as never)

    const result = await listApprovalRequests({})

    expect(result.total).toBe(3)
    expect(result.approvals).toEqual([
      expect.objectContaining({
        id: 'shopping-shopping-1',
        type: 'SHOPPING_ITEM',
        title: 'Milk',
        actionable: false,
        requestedAt: '2026-05-17T12:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'reward-reward-1',
        type: 'REWARD_REDEMPTION',
        familyMemberName: 'Bob Example',
        actionable: true,
      }),
      expect.objectContaining({
        id: 'chore-chore-1',
        type: 'CHORE_COMPLETION',
        familyMemberName: 'Alice Example',
        priority: 'HIGH',
        actionable: true,
        metadata: expect.objectContaining({
          credits: 10,
          photoUrl: '/proof.png',
        }),
      }),
    ])
  })

  it('parses prefixed bulk ids and reports read-only shopping requests', async () => {
    approveChore.mockResolvedValue({
      success: true,
      completion: { id: 'chore-1', status: 'APPROVED' },
      credits_awarded: 10,
    })

    const result = await processApprovalRequests({
      decision: 'APPROVE',
      itemIds: ['chore-chore-1', 'shopping-shopping-1'],
    })

    expect(result).toEqual({
      success: ['chore-chore-1'],
      failed: [
        {
          itemId: 'shopping-shopping-1',
          reason: 'Shopping requests are read-only',
        },
      ],
      total: 2,
    })
    expect(approveChore).toHaveBeenCalledWith('chore-1', 'parent-test-123')
  })

  it('approves a reward redemption through the shared lifecycle', async () => {
    dbMock.rewardRedemption.findUnique.mockResolvedValue({
      id: 'reward-redemption-1',
      memberId: 'child-1',
      rewardId: 'reward-1',
      status: 'PENDING',
      reward: {
        id: 'reward-1',
        familyId: 'family-test-123',
        name: 'Ice Cream',
        costCredits: 50,
      },
      member: {
        id: 'child-1',
        name: 'Child One',
      },
    } as never)
    dbMock.rewardRedemption.update.mockResolvedValue({
      id: 'reward-redemption-1',
      status: 'APPROVED',
      reward: {
        id: 'reward-1',
        name: 'Ice Cream',
      },
      member: {
        id: 'child-1',
        name: 'Child One',
      },
    } as never)
    dbMock.notification.create.mockResolvedValue({ id: 'notification-1' } as never)
    dbMock.auditLog.create.mockResolvedValue({ id: 'audit-1' } as never)

    const result = await approveRewardRedemptionRequest('reward-redemption-1', {
      forbiddenMessage: 'Forbidden',
    })

    expect(result.message).toContain('Approved Child One')
    expect(result.redemption).toEqual(
      expect.objectContaining({
        id: 'reward-redemption-1',
        status: 'APPROVED',
      })
    )
    expect(dbMock.notification.create).toHaveBeenCalled()
    expect(dbMock.auditLog.create).toHaveBeenCalled()
  })
})
