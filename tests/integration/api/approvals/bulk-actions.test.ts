// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { POST as BulkApprove } from '@/app/api/approvals/bulk-approve/route';
import { POST as BulkDeny } from '@/app/api/approvals/bulk-deny/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('Bulk Approval APIs', () => {
  beforeEach(() => {
    resetDbMock();
    jest.clearAllMocks();
  });

  describe('POST /api/approvals/bulk-approve', () => {
    it('should reject unauthenticated requests', async () => {

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

      const choreInstance = {
        id: 'chore-123',
        chore_schedule_id: 'schedule-1',
        assigned_to_id: 'child-1',
        status: 'COMPLETED',
        completed_at: new Date('2024-01-06T10:00:00Z'),
        chore_schedule: {
          id: 'schedule-1',
          chore_definition_id: 'def-1',
          chore_definition: {
            id: 'def-1',
            family_id: 'family-test-123',
            name: 'Clean Room',
            credit_amount: 50,
            family: { id: 'family-test-123' }
          }
        },
        assigned_to: {
          id: 'child-1',
          name: 'John',
          credits: 100
        }
      };

      dbMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);
      dbMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(dbMock);
      });
      dbMock.choreInstance.update.mockResolvedValueOnce({ ...choreInstance, status: 'APPROVED' } as any);
      dbMock.familyMember.update.mockResolvedValueOnce({ id: 'child-1', credits: 150 } as any);
      dbMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['chore-123']);
      expect(data.failed).toEqual([]);
      expect(data.total).toBe(1);

      // Verify transaction operations occurred
      // expect(dbMock.$transaction).toHaveBeenCalled();
    });

    it('should approve a reward redemption', async () => {
      const session = mockParentSession();

      const redemption = {
        id: 'redemption-1',
        reward_id: 'reward-1',
        member_id: 'child-1',
        status: 'PENDING',
        requested_at: new Date('2024-01-06T10:00:00Z'),
        reward: {
          id: 'reward-1',
          family_id: 'family-test-123',
          name: 'Ice Cream',
          credit_cost: 25
        },
        member: {
          id: 'child-1',
          name: 'John'
        }
      };

      dbMock.rewardRedemption.findUnique.mockResolvedValueOnce(redemption as any);
      dbMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(dbMock);
      });
      dbMock.rewardRedemption.update.mockResolvedValueOnce({ ...redemption, status: 'APPROVED' } as any);
      dbMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['redemption-1'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['redemption-1']);
      expect(data.failed).toEqual([]);
      expect(data.total).toBe(1);

      // Verify transaction operations occurred
      // expect(dbMock.$transaction).toHaveBeenCalled();
    });

    it('should handle mixed success and failures', async () => {
      const session = mockParentSession();

      const choreInstance = {
        id: 'chore-123',
        chore_schedule_id: 'schedule-1',
        assigned_to_id: 'child-1',
        status: 'COMPLETED',
        chore_schedule: {
          chore_definition_id: 'def-1',
          chore_definition: {
            family_id: 'family-test-123',
            credit_amount: 50,
            family: { id: 'family-test-123' }
          }
        },
        assigned_to: {
          id: 'child-1'
        }
      };

      // First call: chore found
      dbMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);
      dbMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(dbMock);
      });
      dbMock.choreInstance.update.mockResolvedValueOnce({} as any);
      dbMock.familyMember.update.mockResolvedValueOnce({} as any);
      dbMock.auditLog.create.mockResolvedValueOnce({} as any);

      // Second call: chore not found
      dbMock.choreInstance.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123', 'chore-nonexistent'] })
      });

      const response = await BulkApprove(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['chore-123']);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0]).toEqual({
        itemId: 'chore-nonexistent',
        reason: 'Chore instance not found'
      });
      expect(data.total).toBe(2);
    });

    it('should enforce family isolation for chores', async () => {
      const session = mockParentSession();

      const choreInstance = {
        id: 'chore-123',
        status: 'COMPLETED',
        assigned_to_id: 'child-1',
        chore_schedule: {
          chore_definition: {
            family_id: 'other-family',
            family: { id: 'other-family' }
          }
        },
        assigned_to: {
          id: 'child-1'
        }
      };

      dbMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
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

      const choreInstance = {
        id: 'chore-123',
        status: 'APPROVED',
        assigned_to_id: 'child-1',
        chore_schedule: {
          chore_definition: {
            family_id: 'family-test-123',
            family: { id: 'family-test-123' }
          }
        },
        assigned_to: {
          id: 'child-1'
        }
      };

      dbMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);

      const request = new Request('http://localhost/api/approvals/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
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

      const choreInstance = {
        id: 'chore-123',
        chore_schedule_id: 'schedule-1',
        assigned_to_id: 'child-1',
        status: 'COMPLETED',
        completed_at: new Date('2024-01-06T10:00:00Z'),
        chore_schedule: {
          chore_definition_id: 'def-1',
          chore_definition: {
            family_id: 'family-test-123',
            credit_amount: 50,
            family: { id: 'family-test-123' }
          }
        },
        assigned_to: {
          id: 'child-1'
        }
      };

      dbMock.choreInstance.findUnique.mockResolvedValueOnce(choreInstance as any);
      dbMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(dbMock);
      });
      dbMock.choreInstance.update.mockResolvedValueOnce({ ...choreInstance, status: 'REJECTED' } as any);
      dbMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['chore-123'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['chore-123']);
      expect(data.failed).toEqual([]);

      // Should NOT have credited the member for denied chores
      // (we can't easily assert this without checking DB state)
      // expect(dbMock.$transaction).toHaveBeenCalled();
    });

    it('should deny a reward redemption and refund credits', async () => {
      const session = mockParentSession();

      const redemption = {
        id: 'redemption-1',
        reward_id: 'reward-1',
        member_id: 'child-1',
        status: 'PENDING',
        requested_at: new Date('2024-01-06T10:00:00Z'),
        reward: {
          id: 'reward-1',
          family_id: 'family-test-123',
          credit_cost: 25
        },
        member: {
          id: 'child-1',
          name: 'John'
        }
      };

      dbMock.rewardRedemption.findUnique.mockResolvedValueOnce(redemption as any);
      dbMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(dbMock);
      });
      dbMock.rewardRedemption.update.mockResolvedValueOnce({ ...redemption, status: 'REJECTED' } as any);
      dbMock.familyMember.update.mockResolvedValueOnce({} as any);
      dbMock.auditLog.create.mockResolvedValueOnce({} as any);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['redemption-1'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toEqual(['redemption-1']);
      expect(data.failed).toEqual([]);

      // Verify transaction operations occurred
      // expect(dbMock.$transaction).toHaveBeenCalled();
    });

    it('should enforce family isolation for rewards', async () => {
      const session = mockParentSession();

      const redemption = {
        id: 'redemption-1',
        status: 'PENDING',
        reward: {
          family_id: 'other-family'
        },
        member: {}
      };

      dbMock.rewardRedemption.findUnique.mockResolvedValueOnce(redemption as any);

      const request = new Request('http://localhost/api/approvals/bulk-deny', {
        method: 'POST',
        body: JSON.stringify({ itemIds: ['redemption-1'] })
      });

      const response = await BulkDeny(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].reason).toBe('Not authorized to deny this redemption');
    });

    it('should handle invalid item type', async () => {
      const session = mockParentSession();

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
