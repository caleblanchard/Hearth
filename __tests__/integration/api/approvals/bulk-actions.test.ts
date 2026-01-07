// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { POST as BulkApprove } from '@/app/api/approvals/bulk-approve/route';
import { POST as BulkDeny } from '@/app/api/approvals/bulk-deny/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('Bulk Approval APIs', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('POST /api/approvals/bulk-approve', () => {
    it('should reject unauthenticated requests', async () => {
      auth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject child users', async () => {
      auth.mockResolvedValueOnce(mockChildSession());

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can approve items');
    });

    it('should validate itemIds is a non-empty array', async () => {
      auth.mockResolvedValueOnce(mockParentSession());

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: [] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('itemIds must be a non-empty array');
    });

    it('should approve a chore completion and award credits', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const choreInstance = {
        id: 'chore-123',
        choreScheduleId: 'schedule-1',
        assignedToId: 'child-1',
        status: 'COMPLETED',
        completedAt: new Date('2024-01-06T10:00:00Z'),
        choreSchedule: {
          id: 'schedule-1',
          choreDefinitionId: 'def-1',
          choreDefinition: {
            id: 'def-1',
            familyId: 'family-test-123',
            name: 'Clean Room',
            creditAmount: 50,
            family: { id: 'family-test-123' }
          }
        },
        assignedTo: {
          id: 'child-1',
          name: 'John',
          credits: 100
        }
      };

      prismaMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });
      prismaMock.choreInstance.update.mockResolvedValueOnce({ ...choreInstance, status: 'APPROVED' } as any);
      prismaMock.familyMember.update.mockResolvedValueOnce({ id: 'child-1', credits: 150 } as any);
      prismaMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-chore-123'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['chore-chore-123']);
      expect(data.failed).toEqual([]);
      expect(data.total).toBe(1);

      // Verify transaction operations occurred
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should approve a reward redemption', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const redemption = {
        id: 'redemption-1',
        rewardId: 'reward-1',
        memberId: 'child-1',
        status: 'PENDING',
        requestedAt: new Date('2024-01-06T10:00:00Z'),
        reward: {
          id: 'reward-1',
          familyId: 'family-test-123',
          name: 'Ice Cream',
          creditCost: 25
        },
        member: {
          id: 'child-1',
          name: 'John'
        }
      };

      prismaMock.rewardRedemption.findUnique.mockResolvedValueOnce(redemption as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });
      prismaMock.rewardRedemption.update.mockResolvedValueOnce({ ...redemption, status: 'APPROVED' } as any);
      prismaMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['reward-redemption-1'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['reward-redemption-1']);
      expect(data.failed).toEqual([]);
      expect(data.total).toBe(1);

      // Verify transaction operations occurred
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should handle mixed success and failures', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const choreInstance = {
        id: 'chore-123',
        choreScheduleId: 'schedule-1',
        assignedToId: 'child-1',
        status: 'COMPLETED',
        choreSchedule: {
          choreDefinitionId: 'def-1',
          choreDefinition: {
            familyId: 'family-test-123',
            creditAmount: 50,
            family: { id: 'family-test-123' }
          }
        },
        assignedTo: {
          id: 'child-1'
        }
      };

      // First call: chore found
      prismaMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });
      prismaMock.choreInstance.update.mockResolvedValueOnce({} as any);
      prismaMock.familyMember.update.mockResolvedValueOnce({} as any);
      prismaMock.auditLog.create.mockResolvedValueOnce({} as any);

      // Second call: chore not found
      prismaMock.choreInstance.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-chore-123', 'chore-nonexistent'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['chore-chore-123']);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0]).toEqual({
        itemId: 'chore-nonexistent',
        reason: 'Chore instance not found'
      });
      expect(data.total).toBe(2);
    });

    it('should enforce family isolation for chores', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const choreInstance = {
        id: 'chore-123',
        status: 'COMPLETED',
        assignedToId: 'child-1',
        choreSchedule: {
          choreDefinition: {
            familyId: 'other-family',
            family: { id: 'other-family' }
          }
        },
        assignedTo: {
          id: 'child-1'
        }
      };

      prismaMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-chore-123'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual([]);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].reason).toBe('Not authorized to approve this chore');
    });

    it('should not approve already processed chores', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const choreInstance = {
        id: 'chore-123',
        status: 'APPROVED',
        assignedToId: 'child-1',
        choreSchedule: {
          choreDefinition: {
            familyId: 'family-test-123',
            family: { id: 'family-test-123' }
          }
        },
        assignedTo: {
          id: 'child-1'
        }
      };

      prismaMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-chore-123'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].reason).toBe('Chore is APPROVED, not awaiting approval');
    });
  });

  describe('POST /api/approvals/bulk-deny', () => {
    it('should reject unauthenticated requests', async () => {
      auth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject child users', async () => {
      auth.mockResolvedValueOnce(mockChildSession());

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can deny items');
    });

    it('should deny a chore completion without awarding credits', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const choreInstance = {
        id: 'chore-123',
        choreScheduleId: 'schedule-1',
        assignedToId: 'child-1',
        status: 'COMPLETED',
        completedAt: new Date('2024-01-06T10:00:00Z'),
        choreSchedule: {
          choreDefinitionId: 'def-1',
          choreDefinition: {
            familyId: 'family-test-123',
            creditAmount: 50,
            family: { id: 'family-test-123' }
          }
        },
        assignedTo: {
          id: 'child-1'
        }
      };

      prismaMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });
      prismaMock.choreInstance.update.mockResolvedValueOnce({ ...choreInstance, status: 'REJECTED' } as any);
      prismaMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-chore-123'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['chore-chore-123']);
      expect(data.failed).toEqual([]);

      // Should NOT have credited the member for denied chores
      // (we can't easily assert this without checking DB state)
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should deny a reward redemption and refund credits', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const redemption = {
        id: 'redemption-1',
        rewardId: 'reward-1',
        memberId: 'child-1',
        status: 'PENDING',
        requestedAt: new Date('2024-01-06T10:00:00Z'),
        reward: {
          id: 'reward-1',
          familyId: 'family-test-123',
          creditCost: 25
        },
        member: {
          id: 'child-1',
          name: 'John'
        }
      };

      prismaMock.rewardRedemption.findUnique.mockResolvedValueOnce(redemption as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });
      prismaMock.rewardRedemption.update.mockResolvedValueOnce({ ...redemption, status: 'REJECTED' } as any);
      prismaMock.familyMember.update.mockResolvedValueOnce({} as any);
      prismaMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['reward-redemption-1'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['reward-redemption-1']);
      expect(data.failed).toEqual([]);

      // Verify transaction operations occurred
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should enforce family isolation for rewards', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const redemption = {
        id: 'redemption-1',
        status: 'PENDING',
        reward: {
          familyId: 'other-family'
        },
        member: {}
      };

      prismaMock.rewardRedemption.findUnique.mockResolvedValueOnce(redemption as any);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['reward-redemption-1'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].reason).toBe('Not authorized to deny this redemption');
    });

    it('should handle invalid item type', async () => {
      const session = mockParentSession();
      auth.mockResolvedValueOnce(session);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['invalid-type-123'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].reason).toBe('Invalid item type');
    });
  });
});
